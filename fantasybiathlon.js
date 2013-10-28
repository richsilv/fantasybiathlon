/*jshint smarttabs:true */
FantasyTeams = new Meteor.Collection("fantasyteams");
Athletes = new Meteor.Collection("athletes");
Races = new Meteor.Collection("races");
Meetings = new Meteor.Collection("meetings");
Nations = new Meteor.Collection("nations");
ThisTeam = new Meteor.Collection(null);
Results = new Meteor.Collection("results");

seasonStart = new Date(2012, 10, 15);
systemDate = new Date(2012, 10, 29);
dateoffset = -335;
lastUpdate = systemDate;
var maxPoints = 15;
var userid = 1;
var finishpoints = [0, 30, 25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
var relaypoints = [0, 15, 10, 8, 6, 4, 3, 2, 1];
var smallpoints = [0, 10, 7, 5, 3, 1];
var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

if (Meteor.isServer) {
    Meteor.startup(function () {
    });

    Accounts.onCreateUser(function(options, user) {
	var newteam = {UserID: user._id,
		       Name: "My Team",
		       transfers: 8,
		       Athletes: ['DUMMY', 'DUMMY', 'DUMMY', 'DUMMY'],
		       teamHistory: []
		      };
	FantasyTeams.insert(newteam);
	if (options.profile) user.profile = options.profile;
	return user;
    });

    Meteor.publish("athletes", function() {
	return Athletes.find();
    });
    Meteor.publish("fantasyteams", function(userid) {
	return FantasyTeams.find({UserID: userid});
    });
    Meteor.publish("meetings", function() {
	return Meetings.find();
    });
    Meteor.publish("races", function() {
	return Races.find();
    });
    Meteor.publish("nations", function() {
	return Nations.find();
    });
    Meteor.publish("results", function() {
	return Results.find();
    });
    Meteor.publish("userData", function() {
	return Meteor.users.find({_id: this.userId}, {fields: {'admin': 1}});
    });
}

if (Meteor.isClient) {
    userid = Meteor.userId();
    Session.set('cross', false);
    var thisteam = null;
    Session.set('natchoice', undefined);
    Session.set('namechoice', '');
    Session.set('genderchoice', 'MW');
    var x = new Date();
    Session.set('date', new Date(x.getTime() + (dateoffset * 1000 * 60 * 60 * 24)));
    Session.set('datestatic', new Date(x.getTime() + (dateoffset * 1000 * 60 * 60 * 24)));
    Session.set('teamnameedit', false);
    Session.set('graphchoice', "progress");

    $(document).ready(function() {
	$(document).foundation();
    });

    Template.topbar.events({
	'click #datefwd': function() {
	    dateoffset += 1;
	    var x = new Date();
	    Session.set('date', new Date(x.getTime() + (dateoffset * 1000 * 60 * 60 * 24)));
	},
	'click #dateback': function() {
	    dateoffset -= 1;
	    var x = new Date();
	    Session.set('date', new Date(x.getTime() + (dateoffset * 1000 * 60 * 60 * 24)));
	},
	'click #logout': function() {
	    Meteor.logout();
	    console.log(Meteor.user());
	}
    });

    Template.teamname.helpers({
	team: function() {
	    return ThisTeam.findOne();
	},
	teamnameedit: function() {
	    return Session.get('teamnameedit');
	}
    });
    Template.teamname.rendered = function() {
	$('#teamnameentry').select();
    };
    Template.teamname.events({
	'click': function(event) {
	    Session.set('teamnameedit', true);
	},
	'blur #teamnameentry': function(event, template) {
	    Session.set('teamnameedit', false);
	    var id = ThisTeam.findOne()._id;
	    ThisTeam.update({_id: id}, {$set: {Name: template.find('#teamnameentry').value}});
	    var fid = FantasyTeams.findOne()._id;
	    FantasyTeams.update({_id: fid}, {$set: {Name: template.find('#teamnameentry').value}});
	},
	'keyup #teamnameentry': function(event, template) {
	    if (event.keyCode == 13) {
		Session.set('teamnameedit', false);
		var id = ThisTeam.findOne()._id;
		ThisTeam.update({_id: id}, {$set: {Name: template.find('#teamnameentry').value}});
		var fid = FantasyTeams.findOne()._id;
		FantasyTeams.update({_id: fid}, {$set: {Name: template.find('#teamnameentry').value}});
	    }
	}
    });

    Template.loggedinscreen.rendered = function() {
	var team = ThisTeam.findOne();
	if (team) team.Athletes.forEach(function(a) {
	    if (a === "DUMMY") $('#teamdrop').slideDown();
	});
    };

    Template.teamtitle.helpers({
	teamPoints: function() {
	    var team = ThisTeam.findOne();
	    if (!team) {return 0;}
	    else {
		var res = getresults(team);
		return res.reduce(function(tot, r) {return tot + (r.Points ? r.Points : 0);}, 0);
	    }
	}
    });

    Template.team.helpers({
	teamdeets: function() {
	    return FantasyTeams.findOne({UserID: userid});
	},
	athletes: function() {
	    if (ThisTeam.findOne()) {return getathletes(ThisTeam.findOne().Athletes);}
	    else {return [];}
	}
    });

    Template.athleteform.helpers({
	nations: function() {
	    var nations = [];
	    var natlist = Athletes.find({});
	    natlist.forEach(function(ath) {
		if (nations.indexOf(ath.Nat) < 0) {
		    nations.push(ath.Nat);
		}
	    });
	    return nations.sort();
	}
    });
    Template.athleteform.events({
	'click #resettransfers': function() {
	    ThisTeam.remove({});
	},
	'change #natdropdown': function(e) {
	    Session.set('natchoice', e.currentTarget.value);
	},
	'keyup #namefilter': function(e) {
	    Session.set('namechoice', e.currentTarget.value);
	},
	'click #mfradiomaster label': function(e) {
	    Session.set('genderchoice', $(e.target).children('span').attr('id'));
	}
    });

    Template.pricebox.helpers({
	teamprice: function() {
	    return Session.get('teamprice');
	},
	pricetarget: function() {
	    if (getteamprice(ThisTeam.findOne()) <= maxPoints) {
		return "under";
	    }
	    else {
		return "over";
	    }
	}
    });

    Template.athletelist.helpers({
	athleteset: function() {
	    var ROWS = 9;
	    var aths = filterathletes(Session.get('genderchoice'), Session.get('natchoice'), Session.get('namechoice'));
	    var cols = Math.ceil(aths.length/ROWS);
	    var athtable = [];
	    for (var i = 0; i < ROWS; i++) {athtable.push('<tr style="white-space:nowrap;">');}
	    for (i = 0; i < aths.length; i++) {
		var flag = aths[i].Nat + '.gif';
		var gender = (aths[i].Gender === "M") ? "male" : "female";
		if (Session.get('blacklist') && Session.get('fullgenders') && Session.get('teamprice')) {
		    if (Session.get('blacklist').indexOf(aths[i].Nat) > -1 ||
			Session.get('fullgenders').indexOf(aths[i].Gender) > -1 ||
			Session.get('teamprice') + aths[i].Price > maxPoints ||
			ThisTeam.findOne().Athletes.indexOf(aths[i].IBUId) > -1) {
			gender += " unavailable";
		    }
		}
		athtable[i % ROWS] += '<td><strong>' +aths[i].Price + '</strong></td>';
		athtable[i % ROWS] += '<td class="flagholder"><div class="smallflag" ' +
		    'style="background-image: url(\'' + flag + '\');"></div></td>';
		athtable[i % ROWS] += '<td class="athlete"><span class="radius label ' + gender + '" id="' + aths[i].IBUId + '">' + aths[i].Name + '</span></td>';
		athtable[i % ROWS] += '<td><div style="width: 1em;"></div></td>';
	    }
	    for (i = 0; i < ROWS; i++) {athtable[i] += '</tr>';}
	    return athtable.join('');
	},
	render: function() {
	    return this.Name;
	},
	nations: function() {
	    var nations = [];
	    var natlist = Athletes.find({});
	    natlist.forEach(function(ath) {
	    if (nations.indexOf(ath.Nat) < 0) {
		nations.push(ath.Nat);
	    }
	});
	return nations.sort();
	}
    });
    Template.athletelist.events({
	'click .athlete': function(e) {
	    var team = Session.get('athletes');
	    var addpos = team.indexOf("DUMMY");
	    if (addpos > -1 && !$(e.currentTarget).children(":first").hasClass('unavailable')) {
		team[addpos] = e.currentTarget.firstChild.id;
		Session.set('athletes', team);
	    }
	}
    });

    Template.athlete.helpers({
	avatar: function() {
	    if (this.Gender === "M") {return "mavatar.png";}
	    else {return "wavatar.png";}
	},
	flag: function() {
	    return this.Nat + '.gif';
	},
	cross: function() {
	    return Session.get("cross");
	},
	GenderLong: function() {
	    if (this.Gender === "M") {return "Male";}
	    else {return "Female";}
	},
	GenderLongLower: function() {
	    if (this.Gender === "M") {return "male";}
	    else {return "female";}
	},
	NatLong: function() {
	    if (!this) {return "";}
	    var nation = Nations.findOne({Nat: this.Nat});
	    if (nation) {
		return nation.LongName;
	    }
	    else {
		return "";
	    }
	},
	pointtotal: function() {
	    var theseres = Results.find({IBUId: this.IBUId, RaceTime: {$gte: seasonStart, $lte: Session.get('date')}});
	    return addpoints(theseres);
	},
    });
    Template.athlete.events({
	'click .teammember': function(e) {
	    if (e.target.className !== 'cross') {
		$('#teamdrop').slideToggle();
		Session.set('cross', !Session.get('cross'));
	    }
	},
	'click .cross': function(e) {
	    var team = Session.get('athletes');
	    if (team.indexOf(e.currentTarget.id) > -1) {
		team[team.indexOf(e.currentTarget.id)] = "DUMMY";
		Session.set('athletes', team);
	    }
	},
	'mouseover .cross': function(e) {
	    $(e.currentTarget).effect("shake", {distance: 2});
	}
    });

    Template.transfermodal.helpers({
	okay: function() {
	    if (!ThisTeam.findOne()) {return false;}
	    var transfers = getchanges();
	    return (transfers.length <= ThisTeam.findOne().transfers);
	},
	transfers: function() {
	    return getchanges();
	},
	remtrans: function() {
	    var transfers = getchanges();
	    if (!ThisTeam.findOne()) {return "";}
	    var remtrans = ThisTeam.findOne().transfers - transfers.length;
	    if (remtrans === 1) {
		return "1 transfer";
	    }
	    else {
		return remtrans + " transfers";
	    }
	},
	hastrans: function() {
	    if (!ThisTeam.findOne()) {return "";}
	    var trans = ThisTeam.findOne().transfers;
	    if (trans === 1) {
		return "1 transfer";
	    }
	    else {
		return trans + " transfers";
	    }
	},
	transferlist: function() {
	    if (!ThisTeam.findOne()) {return "";}
	    var transfers = getchanges();
	    var list = '<table>';
	    for (var i = 0; i < transfers.length; i++) {
		list += '<tr>' + athletetile(transfers[i][1]) + '<td>';
		if (transfers[i][0] !== "DUMMY") list += 'for </td>' + athletetile(transfers[i][0]);
		list += '</tr>';
	    }
	    return list + '</table>';
	}
    });
    Template.transfermodal.events({
	'click #confirmtransferbutton': function() {
	    $('#transfermodal').foundation('reveal', 'close');
	    var transfers = getchanges();
	    ThisTeam.update({}, {$inc: {transfers: -transfers.length}});
	    var team = ThisTeam.findOne();
	    team.teamHistory.push([team.Athletes, Session.get('date')]);
	    ThisTeam.update({}, team);
	    FantasyTeams.update({_id: team._id}, team);
	}
    });

    Template.resultslist.helpers({
	okay: function() {
	    if (!ThisTeam.findOne()) {return false;}
	    else {return true;}
	},
	results: function() {
	    var team = ThisTeam.findOne();
	    if (!team) {return [];}
	    else {
		return getresults(team);
	    }
	}
    });
    Template.result.helpers({
	racedeets: function() {
	    var race = Races.findOne({RaceId: this.RaceId});
	    var meeting = Meetings.findOne({EventId: race.EventId});
	    return race.ShortDescription + ' at ' + meeting.Organizer;
	},
	racetime: function() {
	    return shortDate(this.RaceTime);
	}
    });
    Template.dateForm.helpers({
	systemDate: function() {
	    return formatDate(Session.get('date'));
	}
    });
    Template.nextrace.helpers({
	lastrace: function() {
	    var race = lastRace(Session.get('date'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	},
	nextrace: function() {
	    var race = nextRace(Session.get('date'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	},
	nextnextrace: function() {
	    var race = nextnextRace(Session.get('date'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	}
    });

    Template.chartsection.events({
	'click li': function(event) {
	    $('#graphchoice li').removeClass("active");
	    $(event.currentTarget).addClass("active");
	    if (Session.get('graphchoice') !== event.currentTarget.id) Session.set('graphchoice', event.currentTarget.id);
	}
    });

    Meteor.setInterval(function() {
	var x = new Date();
	var newdate = x.getTime() + (dateoffset * 1000 * 60 * 60 * 24);
	Session.set('date', new Date(newdate));
	var curstatic = Session.get('datestatic');
	if (curstatic.getDate() !== (new Date(newdate)).getDate()) Session.set('datestatic', new Date(newdate));
    }, 5000);

    Deps.autorun(function() {
	Meteor.subscribe("fantasyteams", Meteor.userId(), function() {});
	Meteor.subscribe("athletes", function() {});
	Meteor.subscribe("nations", function() {});
	Meteor.subscribe("races", function() {});
	Meteor.subscribe("meetings", function() {});
	Meteor.subscribe("results", function() {});
	Meteor.subscribe("userData", function() {});
    });
    Deps.autorun(function() {
	if (Meteor.userId() && FantasyTeams.findOne()) {
	    Session.set('userID', Meteor.userId());
	    var thisteam = FantasyTeams.findOne();
	    if (ThisTeam.find().count() === 0) {
		ThisTeam.insert(thisteam);
		Session.set('athletes', thisteam.Athletes);
		Session.set('teamID', Meteor.userId());
	    }
	}
    });
    Deps.autorun(function() {
	ThisTeam.update({}, {$set: {Athletes: Session.get('athletes')}});
    });
    Deps.autorun(function() {
	var athletes = Session.get('athletes');
	nations = [];
	blacklist = [];
	if (athletes) {
	    for (var i = 0; i < athletes.length; i++) {
		ath = Athletes.findOne({IBUId: athletes[i]});
		if (ath) {
		    if (nations.indexOf(ath.Nat) > -1) {
			blacklist.push(ath.Nat);
		    }
		    else {
			nations.push(ath.Nat);
		    }
		    Session.set('blacklist', blacklist);
		}
	    }
	}
    });
    Deps.autorun(function() {
	var athletes = Session.get('athletes');
	genders = [];
	fullgenders = [];
	if (athletes) {
	    for (var i = 0; i < athletes.length; i++) {
		ath = Athletes.findOne({IBUId: athletes[i]});
		if (ath) {
		    if (genders.indexOf(ath.Gender) > -1) {
			fullgenders.push(ath.Gender);
			}
		    else {
			genders.push(ath.Gender);
		    }
		    Session.set('fullgenders', fullgenders);
		}
	    }
	}
    });
    Deps.autorun(function() {
	Session.set('teamprice', getteamprice(ThisTeam.findOne()));
    });
    Deps.autorun(function() {
	var team = ThisTeam.findOne();
	if (team) {
	    var ctx = $("#graphcanvas").get(0).getContext("2d");
	    var dataChart = new Chart(ctx);
	    switch(Session.get('graphchoice')) {
		case "bestathletes":
		var dataraw = bestathletes(Session.get('datestatic'));
		var data = {
		    labels : dataraw[0],
		    datasets : [
			{
			    fillColor : "rgba(220,220,220,0.5)",
			    strokeColor : "rgba(220,220,220,1)",
			    data : dataraw[1]
			    }
			]
		}
		new Chart(ctx).Bar(data);
		break;

		case "scorers":
		var dataraw = contributions(Session.get('datestatic'));
		var colors = [];
		var data = [];
		for (i=0; i < dataraw[0].length; i++) {
		    colors.push('hsl(' + Math.floor(i * 360 / dataraw[0].length) + ', 30%, 70%)');
		    data.push({value: dataraw[1][i], color: colors[i]});
		}
		new Chart(ctx).Doughnut(data);
		break;

		default:
		var dataraw = chartdata(team);
		var data = {
		    labels : dataraw[0],
		    datasets: [{
			fillColor : "rgba(151,187,205,0.5)",
			strokeColor : "rgba(151,187,205,1)",
			pointColor : "rgba(151,187,205,1)",
			pointStrokeColor : "#fff",
			data : dataraw[1]
		    }]
		}
		new Chart(ctx).Line(data);
	    }
	}	
    });
}

function filterathletes(gender, nation, name) {
    if (name === undefined) {name='';}
    if (name) {name = name.toLowerCase();}
    var filter = {};
    if (gender !== undefined && gender !== "MW") {filter.Gender = gender;}
    if (nation !== undefined && nation !== "") {filter.Nat = nation;}
    var athletes = Athletes.find(filter, {sort: {Price: -1}});
    var finalset = [];
    athletes.forEach(function(ath) {
	if (ath.Name.toLowerCase().indexOf(name) > -1) {
	    finalset.push(ath);
	}
    });
    return finalset;
}

function getathletes(ibuarray) {
    if (!ibuarray) {return [];}
    var athletearray = [];
    for (var i = 0; i < ibuarray.length; i++) {
	athletearray.push(Athletes.findOne({IBUId: ibuarray[i]}));
    }
    return athletearray;
}

function getteamprice(getteam) {
    if (getteam) {
	var team = getathletes(getteam.Athletes);
	var total = 0;
	for (var i = 0; i < team.length; i++) {
	    if (team[i]) {
		total += team[i].Price;
	    }
	}
	return Math.round(total*10)/10;
    }
    else {
	return 0;
    }
}

function getteamtotal(getteam) {
    if (getteam) {
	var team = getathletes(getteam.Athletes);
	var total = 0;
	for (var i = 0; i < team.length; i++) {
	    total += team[i].Score;
	}
	return total;
    }
    else {
	return 0;
    }
}

function getchanges() {
    var oldteam = FantasyTeams.findOne();
    var newteam = Session.get('athletes');
    if (!oldteam) {return [];}
    else {oldteam = oldteam.Athletes;}
    var commplayers = [];
    for (var i = 0; i < oldteam.length; i++) {
	if (newteam.indexOf(oldteam[i]) > -1) {
	    commplayers.push(oldteam[i]);
	}
    }
    changes = [];
    oldc = 0;
    newc = 0;
    while (oldc < oldteam.length) {
	if (commplayers.indexOf(oldteam[oldc]) === -1) {
	    while (commplayers.indexOf(newteam[newc]) !== -1 && newc < newteam.length) {
		newc += 1;
	    }
	    changes.push([oldteam[oldc], newteam[newc]]);
	    newc += 1;
	}
	oldc += 1;
    }
    return changes;
}

function athletetile(IBUId) {
    var athlete = Athletes.findOne({IBUId: IBUId});
    if (!athlete) {return "";}
    var flag = athlete.Nat + '.gif';
    var gender = (athlete.Gender === "M") ? "male" : "female";
    var tile = '<td><strong>' +athlete.Price + '</strong></td>';
    tile += '<td class="flagholder"><div class="smallflag" ' +
		    'style="background-image: url(\'' + flag + '\');"></div></td>';
    tile += '<td class="athlete"><span class="radius label ' + gender + '">' + athlete.Name + '</span></td>';
    return tile;
}

nextRace = function(date) {
    if (typeof date == 'undefined') {date = new Date();}
    var next = Races.findOne({StartTime: {$gte: date}}, {sort: {StartTime: 1}});
    return next;
};

nextnextRace = function(date) {
    if (typeof date == 'undefined') {date = new Date();}
    var next = Races.find({StartTime: {$gte: date}}, {sort: {StartTime: 1}}).fetch()[1];
    return next;
};

lastRace = function(date) {
    if (typeof date == 'undefined') {date = new Date();}
    var prev = Races.findOne({StartTime: {$lte: date}}, {sort: {StartTime: -1}});
    return prev;
};

racedate = function(race) {
    if (typeof race == 'undefined') {return "";}
    else {return formatDate(race.StartTime);}
};

racetype = function(race) {
    if (typeof race == 'undefined') {return "";}
    else {return race.Description;}
};

racelocation = function(race) {
    if (typeof race == 'undefined') {return "";}
    var eventid = race.EventId;
    var event =  Meetings.findOne({EventId: eventid});
    if (typeof event == 'undefined') {return "";}
    else {return event.ShortDescription + ', ' + Nations.findOne({Nat: event.Nat}).LongName;}
};

formatDate = function(date) {
    if (typeof date != 'object') {return null;}
    else {
	return weekdays[date.getUTCDay()] + ', ' + date.getUTCDate().toString() + ' ' + months[date.getUTCMonth()] + ' ' + date.getUTCFullYear().toString() + ' - ' + pad(date.getUTCHours().toString(), 2) + ":" + pad(date.getUTCMinutes().toString(), 2);
    }
};

shortDate = function(date) {
    if (typeof date != 'object') {return null;}
    else {
	return date.getUTCDate().toString() + ' ' + months[date.getUTCMonth()] + ' ' + (date.getUTCFullYear() % 100).toString();
    }
};

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function athleteracepoints(r) {
    var points = 0;
    if (typeof r == 'undefined') {console.log("no match"); return 0;}
    if (r.ResultOrder > 998) {console.log("DNF"); return 0;}
    else if (r.RaceId.substr(r.RaceId.length-2) === 'RL') {
	points += relaypoints[r.ResultOrder] ? relaypoints[r.ResultOrder] : 0;
	if (r.Shootings.reduce(function(tot, x) {return tot + x;}, 0) === 0) {points += 5;}
    }
    else {
	points += finishpoints[r.ResultOrder] ? finishpoints[r.ResultOrder] : 0;
	if (r.CourseRank != 'undefined') {
	    points += smallpoints[r.CourseRank] ? smallpoints[r.CourseRank] : 0;
	}
	points += (r.ShootingTotal === 0 ? 5 : 0);
	points += (r.Shootings.reduce(function(total, x) {return x === 0 ? total+1 : total;}, 0));
	if (r.RangeTime != 'undefined') {
	    var minmisses = Results.findOne({RaceId: r.RaceId, ResultOrder: {$lte: 998}}, {fields: {ShootingTotal: 1}, sort: {ShootingTotal: 1}}).ShootingTotal;
	    var shootorder = Results.find({RaceId: r.RaceId, ShootingTotal: minmisses, ResultOrder: {$lte: 998}}, {sort: {RangeTime: 1}}).fetch();
	    points += shootorder.reduce(function(t, e, i) {return (e.IBUId === r.IBUId) ? t + (smallpoints[i + 1] ? smallpoints[i + 1] : 0) : t;}, 0);
	}
    }
    return points;
}

function updateallpoints(force) {
    var res;
    if (force) {
	res = Results.find();
    }
    else {
	res = Results.find({Points: null});
    }
    res.map(function(r) {
	console.log(r.IBUId + ' - ' + r.RaceId);
	Results.update({_id: r._id}, {$set: {Points: athleteracepoints(r)}});
    });
}

function clearallpoints() {
    Results.update({}, {$unset: {Price: ""}}, {multi: true});
}

function addpoints(results) {
    return results.fetch().reduce(function(tot, res) {return tot + (res.Points ? res.Points : 0);}, 0);
}

function updateracetimes(force) {
    races = Races.find({});
    races.map(function(r) {
	console.log(r.RaceId);
	if (force) {
	    Results.update({RaceId: r.RaceId}, {$set: {RaceTime: r.StartTime}}, {multi: true});
	}
	else {
	    Results.update({RaceTime: null, RaceId: r.RaceId}, {$set: {RaceTime: r.StartTime}}, {multi: true});
	}
    });
}

getresults = function(team) {
    var compfunc = function(a, b) {
	return a.RaceTime > b.RaceTime ? 1 : a.RaceTime < b.RaceTime ? -1 : 0;
    }
    if (!team) {return [];}
    results = [];
    for (var i = 0; i < team.teamHistory.length; i++) {
	var dtstart = team.teamHistory[i][1];
	var dtend;
	if (i < team.teamHistory.length - 1) {
	    dtend = team.teamHistory[i+1][1];
	}
	else {
	    dtend = Session.get('datestatic');
	}
	results = results.concat(Results.find({IBUId: {$in: team.teamHistory[i][0]}, RaceTime: {$lt: dtend, $gte: dtstart}}).fetch());
    }
    return results.sort(compfunc);
};

chartdata = function(team) {
    var res = getresults(team);
    var zs = ['']
    var ys = [seasonStart];
    var xs = [0];
    var runtotal = 0;
    for (var i = 0; i < res.length; i++) {
	if (res[i].RaceTime.getTime() - ys[ys.length - 1].getTime() > 43200000) {
	    runtotal += res[i].Points;
	    var t = res[i].RaceTime;
	    ys.push(t);
	    zs.push(t.getDay() + '/' + t.getMonth() + '/' + (t.getYear() % 100))
	    xs.push(runtotal);
	}
	else {
	    runtotal += res[i].Points;
	    xs[xs.length - 1] += res[i].Points;
	}
    }
    return [zs, xs];
}

bestathletes = function(date) {
    var compfunc = function(a, b) {return pointsobj[a] > pointsobj[b] ? -1 : 1;}
    if (!date) date = new Date();
    var pointsobj = {};
    var res = Results.find({Points: {$gt: 0}, RaceTime: {$lte: date}}, {fields: {IBUId: 1, Points: 1}});
    res.forEach(function(r) {
	if (r.IBUId in pointsobj) {
	    pointsobj[r.IBUId] += r.Points;
	}
	else {
	    pointsobj[r.IBUId] = r.Points;
	}
    });
    ibuids = ((Object.keys(pointsobj)).sort(compfunc)).slice(0, 10);
    points = [];
    names = [];
    ibuids.forEach(function(r) {
	names.push(Athletes.findOne({IBUId: r}).ShortName);
	points.push(pointsobj[r]);
    });
    return [names, points];
};

contributions = function(date) {
    var compfunc = function(a, b) {return pointsobj[a] > pointsobj[b] ? -1 : 1;}
    team = ThisTeam.findOne();
    if (!team) return [[], []];
    var res = getresults(team);
    var pointsobj = {};
    res.forEach(function(r) {
	if (r.IBUId in pointsobj) {
	    pointsobj[r.IBUId] += r.Points;
	}
	else {
	    pointsobj[r.IBUId] = r.Points;
	}
    });
    ibuids = ((Object.keys(pointsobj)).sort(compfunc)).slice(0, 10);
    points = [];
    names = [];
    ibuids.forEach(function(r) {
	names.push(Athletes.findOne({IBUId: r}).ShortName);
	points.push(pointsobj[r]);
    });
    return [names, points];
}    
