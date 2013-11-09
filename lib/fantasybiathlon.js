/*jshint smarttabs:true */
FantasyTeams = new Meteor.Collection("fantasyteams");
Athletes = new Meteor.Collection("athletes");
Races = new Meteor.Collection("races");
Meetings = new Meteor.Collection("meetings");
Nations = new Meteor.Collection("nations");
ThisTeam = new Meteor.Collection(null);
Results = new Meteor.Collection("results");
Statistics = new Meteor.Collection("statistics");
SystemVars = new Meteor.Collection("systemvars");
Minileagues = new Meteor.Collection("minileagues");

seasonStart = new Date(2012, 10, 15);
makeDate = new Date(2013, 1, 8);
systemDate = new Date(2012, 10, 29);
lastUpdate = systemDate;
var maxPoints = 15;
var userid = 1;
var finishpoints = [0, 30, 25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
var relaypoints = [0, 15, 10, 8, 6, 4, 3, 2, 1];
var smallpoints = [0, 10, 7, 5, 3, 1];
var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

if (Meteor.isClient) {
    userid = Meteor.userId();
    Session.set('cross', false);
    var thisteam = null;
    Session.set('natchoice', undefined);
    Session.set('namechoice', '');
    Session.set('genderchoice', 'MW');
    var x = new Date();
    Session.set('teamnameedit', false);
    Session.set('graphchoice', "progress");
    Session.set('league', "overall");
    Session.set('databarcontent', 'league');
    Session.set('pagenumber', 1);
    Session.set('createjoin', true);
    Session.set('unsavedchanges', false);

    Meteor.startup(function() {
    	placeholder = new Image();
    	placeholder.src = 'placeholder.png';
    });

    Template.topbar.helpers({
    	unsavedchanges: function() {
    		return Session.get('unsavedchanges');
    	}
    });
    Template.topbar.events({
	'click #datefwd': function() {
	    var offsetvar = SystemVars.findOne({Name: "dateoffset"});
	    var id = offsetvar ? offsetvar._id : null;
	    var value = offsetvar ? offsetvar.Value : 0;
	    var dateoffset = value + (24 * 60);
	    SystemVars.update({_id: id}, {$set: {Value: dateoffset}});
	    var x = new Date();
	    Session.set('date', new Date(x.getTime() + (dateoffset * 60000)));
	},
	'click #dateback': function() {
	    var offsetvar = SystemVars.findOne({Name: "dateoffset"});
	    var id = offsetvar ? offsetvar._id : null;
	    var value = offsetvar ? offsetvar.Value : 0;
	    var dateoffset = value - (24 * 60);
	    SystemVars.update({_id: id}, {$set: {Value: dateoffset}});
	    var x = new Date();
	    Session.set('date', new Date(x.getTime() + (dateoffset * 60000)));
	},
	'click #transfers': function() {
	    Session.set('modal', 'transfers');
	},
	'click #rules': function() {
	    Session.set('modal', 'rules');
	},
	'click #scoring': function() {
	    Session.set('modal', 'scoring');
	},
	'click #logout': function() {
	    Meteor.logout(function() {
		ThisTeam.remove({});
	    });
	}
    });
    Template.topbar.rendered = function() {
	$(document).foundation();
	var x = new Date();
	var offsetvar = SystemVars.findOne({Name: "dateoffset"});
	var value = offsetvar ? offsetvar.Value : 0;
	var newdate = x.getTime() + (value * 60000);
	$('#titledate').html(shortDate(new Date(newdate)));
	$('#titletransfers').html(gettransfers());
    };

    Template.loggedinscreen.helpers({
	newuser: function() {
	    return Session.get('newuser');
	}
    });
    Template.loggedinscreen.rendered = function() {
		if (Meteor.Device.isPhone()) $('#databar').show();
		else $('#databar').slideDown();
    };

    Template.databarcontents.helpers({
	databarcontent: function() {
	    switch(Session.get('databarcontent')) {
	    case 'calendar':
		return Template.nextrace();

	    case 'venue':
		return Template.map();

	    default:
		return Template.leaguetable();
	    }
	}
    });

    Template.breadcrumbs.helpers({
    	league: function() {
    		return (Session.get('databarcontent') === 'league')
    	},
    	calendar: function() {
    		return (Session.get('databarcontent') === 'calendar')
    	},
    	venue: function() {
    		return (Session.get('databarcontent') === 'venue')
    	}
    })
    Template.breadcrumbs.events({
	'click #databarselect li': function(event) {
	    var thisid = event.currentTarget.id;
	    if (Session.get('databarcontent') !== thisid) {
			if (Meteor.Device.isPhone()) Session.set('databarcontent', thisid);
			else {
				setTimeout(function() {
		    		Session.set('databarcontent', thisid);
				}, 400);
				$('#databar').slideUp();
	    	}
		}
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

    Template.modalrender.helpers({
	renderdeets: function() {
	    switch(Session.get('modal')) {
	    case 'transfer':
		return Template.transfermodal();

	    case 'results':
		return Template.resultslist();

	    case 'calendar':
		return calendar();

	    case 'rules':
		return Template.rules();

	    case 'scoring':
		return Template.scoring();

	    case 'transfers':
		return Template.transfers();

	    case 'league':
		return Template.fullleague();

	    case 'leaguecreated':
		return Template.leaguecreated();

	    case 'leaguecreatederror':
		return Template.leagecreatederror();

	    case 'leaguejoined':
		return Template.leaguejoined();
	
	    case 'leaguejoinederror':
		return Template.leaguejoinederror();

	    case 'leaguejoinedalready':
		return Template.leaguejoinedalready();

		case 'unverified':
		return Template.unverified();

	    default:
		return "";
	    }
	}
    });
    Template.modalrender.rendered = function() {
	$('#modal').bind('close', function() {
	    Session.set('pagenumber', 1);
	    var oldmodal = Session.get('modal');
	    if (oldmodal === 'leaguecreated' || oldmodal === 'leaguejoined' || oldmodal ==='leaguejoinedalready') {
		Session.set('league', Session.get('leagueid'));
		Session.set('databarcontent', 'league');
	    }
	    else if (oldmodal === 'leaguejoinederror' || oldmodal === 'leaguecreatederror') {
		Session.set('league', 'overall');
		Session.set('databarcontent', 'league');
	    }
	    Session.set('modal', null);
	});
	var width = parseInt($('#modal').css('width'), 10);
	$('#modal').css('margin-left', Math.floor(($(window).width()/2) - (width/2)) + 'px');
	$('#modal').css('left', '0px');
	if (Session.get('modal')) $('#modal').foundation('reveal', 'open');
	else $('#modal').foundation('reveal', 'close');
    };

    Template.fullleague.helpers({
	contents: function() {
	    var league = Session.get('league');
	    var table = gettable(league);
	    var myteam = ThisTeam.findOne();
	    if (myteam) return fulltable(table, myteam._id, 20, Session.get('pagenumber'));
	    else return fulltable(table, "", 20, Session.get('pagenumber'));
	}
    });
    Template.fullleague.events({
	'click .pagination li': function(event) {
	    var choice = event.currentTarget.id;
	    var avail = event.currentTarget.className;
	    var currpage = Session.get('pagenumber');
	    if (choice.slice(0, 4) === 'page') Session.set('pagenumber', parseInt(choice.slice(4), 10));
	    else if (choice === 'downarrow' && avail.indexOf('unavailable') === -1) Session.set('pagenumber', currpage - 1);
	    else if (choice === 'uparrow' && avail.indexOf('unavailable') === -1) Session.set('pagenumber', currpage + 1);
	}
    });

    Template.createjoinleague.helpers({
	create: function() {
	    return Session.get('createjoin');
	}
    });
    Template.createjoinleague.events({
	'click dd': function(event) {
	    var id = event.currentTarget.id;
	    if (id === 'createsub' && !Session.get('createjoin')) Session.set('createjoin', true);
	    else if (id === 'joinsub' && Session.get('createjoin')) Session.set('createjoin', false);
	},
	'submit #createform': function() {
	    var name = $('#leaguename').val();
	    $('#leaguename').val('');
	    var admin = Meteor.userId();
	    var team = ThisTeam.findOne()._id;
	    Minileagues.insert({Name: name, Teams: [team], Admin: admin, sendCode: true}, function(err, league) {
		if (err) Session.set('modal', 'leaguecreatederror');
		else {
		    Session.set('leagueid', league);
		    Session.set('modal', 'leaguecreated');
		}
	    });
	    return false;
	},
	'submit #joinform': function() {
	    var id = $('#leagueid').val();
	    $('#leagueid').val('');
	    var team = ThisTeam.findOne()._id;
	    var league = Minileagues.findOne({_id: id});
	    if (!league) {
		Session.set('modal', 'leaguejoinederror');
		return;
	    }
	    if (_.contains(league.Teams, team)) {
		Session.set('leagueid', id);
		Session.set('modal', 'leaguejoinedalready');
		return;
	    }
	    Minileagues.update({_id: id}, {$push: {Teams: team}}, {}, function(err, docnum) {
		if (err || docnum === 0) Session.set('modal', 'leaguejoinederror');
		else {
		    Session.set('leagueid', id);
		    Session.set('modal', 'leaguejoined');
		}
	    });
	    return false;
	}

    });

    Template.team.rendered = function() {
	var team = ThisTeam.findOne();
	if (team) team.Athletes.forEach(function(a) {
	    if (a === "DUMMY") $('#teamdrop').slideDown();
	    Session.set('cross', true);
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
    Template.teamtitle.events({
	'click #pointslink': function() {
	    Session.set('modal', 'results');
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
		},
		unverified: function() {
			return (!_.find(Meteor.user().emails, function(entry) {return entry.verified;}));	
		}
    });
    Template.athleteform.events({
	'click #resettransfers': function() {
	    ThisTeam.remove({});
	},
	'click #savetransfers': function() {
		if (_.find(Meteor.user().emails, function(entry) {return entry.verified;})) Session.set('modal', 'transfer');
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

    Template.transfers.helpers({
	transfers: function() {
	    var team = ThisTeam.findOne();
	    if (team) return team.teamHistory;
	    else return [];
	}
    });

    Template.transfer.helpers({
    	transferrow: function() {
    		var aths = getathletes(this[0]);
    		var transstring = '<tr><td>' + shortDate(this[1]) + '</td>';
    		var a;
    		for (i = 0; i < aths.length; i++) {
    			a = aths[i];
    			var flag = a.Nat + '.gif';
    			var gender = (a.Gender === "M") ? "male" : "female";
    			if (Meteor.Device.isPhone()) {
    				transstring += '<td><div class="athlete"><span class="radius label ' + gender + '">' + a.ShortName + '</span></div><div class="flagholder"><div class="smallflag" ' +
    				'style="background-image: url(\'' + flag + '\');"></div></div></td>';
    				if (i == 1) transstring += '</tr><tr style="border-bottom: thin grey dotted"><td></td>';
    			}
    			else {
    				transstring += '<td class="flagholder"><div class="smallflag" ' +
    				'style="background-image: url(\'' + flag + '\');"></div></td><td class="athlete"><span class="radius label ' + gender + '">' + a.ShortName + '</span></td>';
    			}
    		}
    		return transstring + '</tr>';
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
	    var theseres = Results.find({IBUId: this.IBUId, RaceTime: {$gte: seasonStart, $lte: Session.get('datestatic')}});
	    return addpoints(theseres);
	},
    });
    Template.athlete.events({
	'click .teammember': function(e) {
	    if (e.target.className !== 'cross') {
			if ($('#teamdrop').css('display') === 'none') {
				if (Meteor.Device.isPhone()) $('#teamdrop').show();
				else $('#teamdrop').slideDown();
				Session.set('cross', true);
			}
			else if (ThisTeam.findOne().Athletes.indexOf('DUMMY') === -1) {
				if (Meteor.Device.isPhone()) ('#teamdrop').hide();
				else $('#teamdrop').slideUp();
				Session.set('cross', false);				
			}
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
	    return (beforeseasonstart() || transfers.length <= ThisTeam.findOne().transfers);
	},
	transfers: function() {
	    return getchanges();
	},
	remtrans: function() {
	    var transfers = getchanges();
	    if (!ThisTeam.findOne()) {return "";}
	    var remtrans;
	    if (beforeseasonstart()) remtrans = ThisTeam.findOne().transfers;
	    else remtrans = ThisTeam.findOne().transfers - transfers.length;
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
	    $('#modal').foundation('reveal', 'close');
	    var transfers = getchanges();
	    var team = ThisTeam.findOne();
	    var id = team._id;
	    delete team._id;
	    team.teamHistory.push([team.Athletes, Session.get('datestatic')]);
	    ThisTeam.update({}, team);
	    FantasyTeams.update({_id: id}, {$set: team});
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
	    var race = lastRace(Session.get('datestatic'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	},
	nextrace: function() {
	    var race = nextRace(Session.get('datestatic'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	},
	nextnextrace: function() {
	    var race = nextnextRace(Session.get('datestatic'));
	    if (!race) return "----------";
	    return racedate(race) + ': <em>' + racetype(race) + '</em>, ' + racelocation(race);
	}
    });
    Template.nextrace.events({
	'click' : function() {
	    Session.set('modal', 'calendar');
	}
    });

    Template.chartsection.events({
	'click li': function(event) {
	    $('#graphchoice li').removeClass("active");
	    $(event.currentTarget).addClass("active");
	    if (Session.get('graphchoice') !== event.currentTarget.id) Session.set('graphchoice', event.currentTarget.id);
	}
    });

    Template.leaguetable.helpers({
	myleagues: function() {
	    return Minileagues.find({}).fetch();
	},
	summary: function() {
	    var league = Session.get('league');
	    var table = gettable(league);
	    if (league === 'join') return Template.createjoinleague();
	    else return tablesummary(table);
	}
    });
    Template.leaguetable.events({
	'click .button': function(event) {
	    if (event.currentTarget.parentNode.id === "noleagues") return false;
	    else if (Session.get('league') !== event.currentTarget.parentNode.id &&
		     event.currentTarget.parentNode.id !== "myleagues") Session.set('league', event.currentTarget.parentNode.id);
	},
	'click #drop1 li': function(event) {
	    if (Session.get('league') !== event.currentTarget.id) Session.set('league', event.currentTarget.id);
	},
	'click table': function (event) {
	    Session.set('modal', 'league');
	}
    });

    Template.leaguecreated.helpers({
	leagueid: function() {
	    return Session.get('leagueid');
	}
    });
    Template.leaguejoined.helpers({
	leaguename: function() {
	    var league = Minileagues.findOne({_id: Session.get('leagueid')});
	    if (league) return league.Name;
	    else return 'UNKNOWN LEAGUE';
	}
    });
    Template.leaguejoinedalready.helpers({
	leaguename: function() {
	    var league = Minileagues.findOne({_id: Session.get('leagueid')});
	    if (league) return league.Name;
	    else return 'UNKNOWN LEAGUE';
	}
    });

    Template.unverified.events({
    	'click #resendverification': function() {
    		Meteor.users.update({_id: Meteor.userId()}, {$set:{sendVerification: true}});
    	}
    });
    Template.unverified.rendered = function() {
    	$('#modal').bind('close', function() {
    		setTimeout(function() {$(document).foundation('joyride', 'start');}, 1000);
    	});
    };

    Meteor.setInterval(function() {
	var x = new Date();
	var offsetvar = SystemVars.findOne({Name: "dateoffset"});
	var value = offsetvar ? offsetvar.Value : 0;
	if (offsetvar) {
	    var newdate = x.getTime() + (value * 60000);
	    Session.set('date', new Date(newdate));
	    var curstatic = Session.get('datestatic');
	    if (curstatic) {
	    	if ((new Date(newdate)).getTime() - curstatic.getTime() > 30000) {
	    		Session.set('datestatic', new Date(newdate));
	    		$('#titledate').html(shortDate(new Date(newdate)));
	    	}
	    }
	    else {
	    	Session.set('datestatic', Session.get('date'));
	    	$('#titledate').html(shortDate(new Date(newdate)));
	    }
	    $('#titletransfers').html(gettransfers());
	}
    }, 1000);

    FantasyTeams.find({}).observeChanges({
    	changed: function(id, fields) {
    		if (fields.transfers) {
    			ThisTeam.update({_id: id}, {$set: {transfers: fields.transfers}});
    		}
    	}
    })

    Deps.autorun(function() {
	var team = FantasyTeams.findOne();
	if (team && team.teamHistory.length === 0) {
	    Session.set('newuser', true);
	}
    });
    Deps.autorun(function() {
    	Meteor.subscribe("fantasyteams", Meteor.userId(), function() {});
    	Meteor.subscribe("athletes", function() {});
    	Meteor.subscribe("nations", function() {});
    	Meteor.subscribe("races", function() {});
    	Meteor.subscribe("meetings", function() {});
    	Meteor.subscribe("results", function() {});
    	Meteor.subscribe("userData", function() {});
    	Meteor.subscribe("statistics", function() {});
    	Meteor.subscribe("minileagues", Meteor.userId(), function() {});
    	Meteor.subscribe("systemvars", {
    		onReady: function() {
    			datetest = setInterval(function() {
    				var offsetvar = SystemVars.findOne({Name: "dateoffset"});
    				var value = offsetvar ? offsetvar.Value : 0;
    				if (offsetvar) clearInterval(datetest);
    				var newdate = x.getTime() + (value * 60000);
    				Session.set('date', new Date(newdate));
    				Session.set('datestatic', new Date(newdate));
    				$('#titledate').html(shortDate(new Date(newdate)));
    			}, 1000);
    		}
    	});
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
		if (Meteor.user() && !_.find(Meteor.user().emails, function(entry) {return entry.verified;}) && !Session.get('verificationreminder') && ThisTeam.findOne()) {
			Session.set('verificationreminder', true);
			Session.set('modal', 'unverified');
		}
	}
    });
    Deps.autorun(function() {
	ThisTeam.update({}, {$set: {Athletes: Session.get('athletes')}});
    });
    Deps.autorun(function() {
    	var savedteam = FantasyTeams.findOne();
		var team = ThisTeam.findOne();
		var change = false;
		if (savedteam && team) {
			for (var i = 0; i < 4; i++) {
				if (savedteam.Athletes.indexOf(team.Athletes[i]) === -1) change = true;
			}
		}
		Session.set('unsavedchanges', change);
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
    		var canvas = $("#graphcanvas").get(0)
    		if (!canvas) return false;
    		else var ctx = canvas.getContext("2d");
    		var dataChart = new Chart(ctx);
    		var data;
    		var dataraw;
    		var colors;
    		switch(Session.get('graphchoice')) {
    			case "bestathletes":
    			dataraw = bestathletes(Session.get('datestatic'));
    			if (dataraw[0].length > 0) {
    				data = {
    					labels : dataraw[0],
    					datasets : [
    					{
    						fillColor : "rgba(220,220,220,0.5)",
    						strokeColor : "rgba(220,220,220,1)",
    						data : dataraw[1]
    					}
    					]
    				};
    				new Chart(ctx).Bar(data);
    			}
    			else {
    				ctx.drawImage(placeholder, 60, 0, 320, 125);
    			}
    				break;

    			case "scorers":
    			dataraw = contributions(Session.get('datestatic'));
    			if (dataraw[0].length > 0) {
    				colors = [];
    				data = [];
    				for (i=0; i < dataraw[0].length; i++) {
    					colors.push('hsl(' + Math.floor(i * 360 / dataraw[0].length) + ', 30%, 70%)');
    					data.push({value: dataraw[1][i], color: colors[i], label: dataraw[0][i]});
    				}
    				new Chart(ctx).Doughnut(data, { tooltips: { labelTemplate: '<%=label%>: foo' } } );
    			}
    			else {
    				ctx.drawImage(placeholder, 60, 0, 320, 125);
    			}
    				break;

    			case "popular":
    			dataraw = getpopular();
    			if (dataraw[0].length > 0) {
    				data = {
    					labels : dataraw[0],
    					datasets : [
    					{
    						fillColor : "rgba(220,220,220,0.5)",
    						strokeColor : "rgba(220,220,220,1)",
    						data : dataraw[1]
    					}
    					]
    				};
    				new Chart(ctx).Bar(data);
    			}
    			else {
    				ctx.drawImage(placeholder, 60, 0, 320, 125);
    			}
    				break;

    			default:
    			dataraw = chartdata(team);
    			if (dataraw[0].length > 1) {
    				data = {
    					labels : dataraw[0].map(function(t) {return t.getDay() + '/' + t.getMonth() + '/' + (t.getYear() % 100);}),
    					datasets: [{
    						fillColor : "rgba(151,187,205,0.5)",
    						strokeColor : "rgba(151,187,205,1)",
    						pointColor : "rgba(151,187,205,1)",
    						pointStrokeColor : "#fff",
    						data : dataraw[1]
    					}]
    				};
    				average = Statistics.findOne({Type: "averagepoints"});
    				if (average) {
    					var avedata = [];
    					dataraw[0].forEach(function(d) {
    						if (average.Data[0].indexOf(d) > -1) {
    							avedata.push(average.Data[1][average.Data[0].indexOf(d)]);
    						}
    					});
    					data.datasets.push({
    						fillColor : "rgba(220,220,220,0.5)",
    						strokeColor : "rgba(220,220,220,1)",
    						pointColor : "rgba(220,220,220,1)",
    						pointStrokeColor : "#fff",
    						data : avedata
    					});
    				}
    				new Chart(ctx).Line(data);
    			}
    			else {
    				ctx.drawImage(placeholder, 60, 0, 320, 125);
    			}
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

function getresults(team, enddate) {
	var compfunc = function(a, b) {
		return a.RaceTime > b.RaceTime ? 1 : a.RaceTime < b.RaceTime ? -1 : 0;
	};
	enddate = enddate ? enddate : (Session.get('datestatic') ? Session.get('datestatic') : new Date());
	if (!team || !team.teamHistory) {return [];}
	results = [];
	for (var i = 0; i < team.teamHistory.length; i++) {
		var dtstart = team.teamHistory[i][1];
		if (dtstart.getTime() > enddate.getTime()) continue;
		var dtend;
		if (i < team.teamHistory.length - 1) {
			dtend = (team.teamHistory[i+1][1].getTime() > enddate.getTime()) ? enddate : team.teamHistory[i+1][1];
		}
		else {
			if (enddate) dtend = enddate;
			else dtend = Session.get('datestatic');
		}
		results = results.concat(Results.find({IBUId: {$in: team.teamHistory[i][0]}, RaceTime: {$lt: dtend, $gte: dtstart}}).fetch());
	}
	return results.sort(compfunc);
}


gettransfers = function() {
	var team = ThisTeam.findOne();
	if (beforeseasonstart()) return "&#8734";
	else if (team) return team.transfers;
	else return '-';
};

chartdata = function(team) {
    var res = getresults(team);
    var zs = [''];
    var ys = [seasonStart];
    var xs = [0];
    var runtotal = 0;
    for (var i = 0; i < res.length; i++) {
	if (res[i].RaceTime.getTime() - ys[ys.length - 1].getTime() > 43200000) {
	    runtotal += res[i].Points;
	    var t = res[i].RaceTime;
	    ys.push(t);
	    zs.push(t.getDay() + '/' + t.getMonth() + '/' + (t.getYear() % 100));
	    xs.push(runtotal);
	}
	else {
	    runtotal += res[i].Points;
	    xs[xs.length - 1] += res[i].Points;
	}
    }
    return [ys, xs];
};

bestathletes = function(date) {
    var compfunc = function(a, b) {return pointsobj[a] > pointsobj[b] ? -1 : 1;};
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
    var compfunc = function(a, b) {return pointsobj[a] > pointsobj[b] ? -1 : 1;};
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
};

getpopular = function() {
    return Statistics.findOne({Type: "popular"}).Data;
};


calendar = function() {
    var races = Races.find();
    var racetable = '<h2>CALENDAR</h2><table class="racetable">';
    races.forEach(function(r) {
	racetable += '<tr><td>' + racedate(r) + '</td><td>' + racetype(r) + '</td><td>' + racelocation(r) + '</td></tr>';
    });
    racetable += '</table>';
    return racetable;
};

function updatepointstable() {
    var teams = FantasyTeams.find();
    var tableobj = {Table: []};
    var offsetvar = SystemVars.findOne({Name: "dateoffset"});
    var enddate = new Date();
    enddate = offsetvar ? new Date(enddate.getTime() + (offsetvar.Value * 60000)) : enddate;
    console.log(enddate);
    teams.forEach(function(t) {
	var res = getresults(t, enddate);
	var p = res.reduce(function(tot, r) {return tot + (r.Points ? r.Points : 0);}, 0);
	console.log(p);
	var user = Meteor.users.findOne({_id: t.UserID});
	if (user) {
	    tableobj.Table.push({Name: t.Name,
				 Country: user.Country,
				 ID: t._id,
				 Points: p
				});
	}
	else {
	    tableobj.Table.push({Name: t.Name,
				 Country: "UNKNOWN",
				 ID: t._id,
				 Points: p
				});
	}
    });
    Statistics.upsert({Type: "pointstable"}, {Type: "pointstable", Data: tableobj}, {}, function(err) {
	if (!err) console.log("Points table updated");
	else console.log("Error writing points table: " + err);
    });
}

function randomteam(startdate, enddate) {
    var namewords = [randomword(4 + Math.floor(Math.random()*5))];
    while (Math.random() < 0.33) {
	namewords.push(randomword(4 + Math.floor(Math.random()*5)));
    }
    startathletes = randomathletes();
    team = {Name: namewords.join(' '), Athletes: startathletes, teamHistory: [[startathletes.map(function(a) {return a.IBUId;}), startdate]]};
    var date = startdate;
    while (date < enddate) {
	if (Math.random() < 0.05) {
	    newathletes = randomathletes();
	    team.Athletes = newathletes;
	    team.teamHistory.push([newathletes.map(function(a) {return a.IBUId;}), date]);
	}
	date = new Date(date.getTime() + (3600000 * 24));
    }
    return team;
}

function removefloatingteams() {
    var teams = FantasyTeams.find();
    teams.forEach(function(t) {
	var u = Meteor.users.findOne({_id: t.UserID});
	if (!u) {
	    console.log("Removing floating team: " + t.Name);
	    FantasyTeams.remove(t);
	}
    });
}

function randomathletes() {
    var athletes = [];
    var ptemp;
    var price = false;
    var country = false;
    var gender = false;
    var athnum = Athletes.find().count();
    var rand = function(){return Math.floor(Math.random() * athnum);};
    var redfunc = function(tot, a) {return tot + a.Price;};
    while(!price || !gender || !country) {
	athletes = [];
	for (var i = 0; i < 4; i++) {
	    athletes.push(Athletes.findOne({}, {skip: rand()}));
	}
	ptemp = athletes.reduce(redfunc, 0);
	price = (ptemp <= 15 && ptemp >= 13);
	country = (maxcount(athletes, 'Nat') <= 2);
	gender = (maxcount(athletes, 'Gender') <= 2);
    }
    return athletes;
}

function maxcount(arr, field) {
    counts = {};
    arr.forEach(function(a) {
	if (Object.keys(counts).indexOf(a[field]) === -1) counts[a[field]] = 1;
	else counts[a[field]] += 1;
    });
    return Object.keys(counts).reduce(function(max, o) {
	return (counts[o] > max) ? counts[o] : max;
    }, 0);
}

function randomword(n) {
    var vowels = ['a', 'e', 'i', 'o', 'u'];
    var consts =  ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'th', 'ch', 'sh'];
    var word = '';
    var vownext = false;
    for (var i = 0; i < n; i++) {
	arr = vownext ? vowels : consts;
	word += arr[Math.floor(Math.random()*(arr.length))];
	if (Math.random() > 0.15) vownext = !vownext;
    }
    return word.slice(0,1).toUpperCase() + word.slice(1);
}

function averageperformance(enddate) {
    if (!enddate) enddate = new Date();
    var races = Races.find({StartTime: {$lte: enddate}});
    var teamnum = FantasyTeams.find().count();
    var dates = [];
    var avg = [];
    var aths;
    var total;
    races.forEach(function(race) {
	console.log(race.RaceId);
	total = 0;
	FantasyTeams.find().forEach(function(team) {
	    if (team.teamHistory.length) aths = team.teamHistory.reduce(function(pre, cur) {
		return (cur[1] > pre[1] && cur[1] <= race.StartTime) ? cur : pre;
	    });
	    else aths = [[], []];
	    total += Results.find({RaceId: race.RaceId, IBUId: {$in: aths[0]}}).fetch().reduce(function(tot, r) {
		return tot + r.Points;
	    }, 0);
	});
	dates.push(race.StartTime);
	avg.push(avg[avg.length - 1] + (total / teamnum));
    });
    return [dates, avg];
}

gettable = function(id) {
    var data = Statistics.findOne({Type: "pointstable"});
    if (!data) return [];
    if (id === "overall") return data.Data.Table;
    else {
	var league = Minileagues.findOne({"_id._str": id});
	if (!league) return [];
	else {
	    return data.Data.Table.filter(function(p) {
		return (league.Teams.indexOf(p.ID) > -1);});
	}
    }
};

prettify = function(entry, rank, myteam) {
    if (!entry) return '';
    if (entry.profile) var country = Nations.findOne({Nat: entry.profile.Nat});
    var myteamclass = myteam ? ' class="myteam"' : '';
    if (country) return '<tr' + myteamclass + '><td>' + rank + '.</td><td>' + entry.Name + '</td><td>' + country.LongName + '</td><td>' + entry.Points + '</td></tr>';
    else return '<tr' + myteamclass + '><td>' + rank + '.</td><td>' + entry.Name + '</td><td>Unkown</td><td>' + entry.Points + '</td></tr>';
};


tablesummary = function(table, teamid) {
    table = table.sort(function(a, b) {return b.Points - a.Points;});
    if (!teamid) {
	var team = ThisTeam.findOne();
	if (team) teamid = team._id;
	else teamid = "NULL";
    }
    var mypos = table.map(function(r) {return r.ID;}).indexOf(teamid);
    var output = ['<table class="leaguetable"><tr><th>Rank</th><th>Team Name</th><th>Country</th><th>Points</th></tr>'];
    var i;
    if (mypos < 3 || mypos > table.length - 4) {
	for (i = 0; i < Math.min(3, table.length); i++) {
	    output.push(prettify(table[i], i+1, (i === mypos)));
	}
	if (table.length > 6) output.push('<tr class="gaprow"><td colspan="4"></td></tr>');
	var tailitems = Math.min(table.length - 3, 3);
	for (i = table.length - tailitems; i < table.length; i++) {
	    output.push(prettify(table[i], i+1, (i === mypos)));
	}
    }
    else {
	output.push(prettify(table[0], 1, (mypos === 0)));
	output.push('<tr class="gaprow"><td colspan="4"></td></tr>');
	for (i = mypos - 2; i < mypos + 3; i++) {
	    output.push(prettify(table[i], i+1, (i === mypos)));
	}
	output.push('<tr class="gaprow"><td colspan="4"></td></tr>');
	output.push(prettify(table[table.length-1], table.length, (mypos === table.length - 1)));
    }
    output.push('</table>');
    return output.join('');
};

fulltable = function(table, teamid, perpage, curpage) {
    table = table.sort(function(a, b) {return b.Points - a.Points;});
    if (!teamid) {
	var team = ThisTeam.findOne();
	if (team) teamid = team._id;
	else teamid = "NULL";
    }
    var numpages = Math.ceil(table.length/perpage);
    var mypos = table.map(function(r) {return r.ID;}).indexOf(teamid);
    var output = [];
    if (numpages > 1) output.push(pagination(table.length, perpage, curpage));
    output.push('<table id="fulltable"><tr><th>Rank</th><th>Team Name</th><th>Country</th><th>Points</th></tr>');
    var i;
    if (curpage < 1) curpage = 1;
    else if (curpage > numpages) curpage = numpages;
    var start = perpage * (curpage - 1);
    var end = Math.min(table.length, start + perpage);
    for (i = start; i < end; i++) {
	output.push(prettify(table[i], i + 1, (i === mypos)));
    }
    output = output.join('') + '</table>';
    return output;
};

pagination = function(numitems, perpage, curpage) {
    var numpages = Math.ceil(numitems/perpage);
    var output = '<ul class="pagination">';
    var indices;
    var i;
    if (numpages < 6) {
	for (i = 1; i <= numpages; i++) {
	    output += '<li';
	    if (i === curpage) output += ' class="current"';
	    output += '><a href="javascript:;">' + indices[i] + '</a></li>';
	}
    }
    else {
	if (curpage < 4) indices = [1, 2, 3, 4, 0, numpages-1, numpages];
	else if (curpage > numpages - 3) indices = [1, 2, 0, numpages - 3, numpages - 2, numpages - 1, numpages];
	else indices = [1, 0, curpage - 2, curpage - 1, curpage, curpage + 1, curpage + 2, 0, numpages];
	output += '<li id="downarrow" class="arrow' ;
	if (curpage === 1) output += ' unavailable';
	output += '"><a href="javascript:;">&laquo;</a></li>';
	for (i = 0; i < indices.length; i++) {
	    if (indices[i] === 0) output += '<li class="unavailable"><a href="">&hellip;</a></li>';
	    else {
		output += '<li id="page' + indices[i] + '"';
		if (indices[i] === curpage) output += ' class="current"';
		output += '><a href="javascript:;">' + indices[i] + '</a></li>';
	    }
	}
	output += '<li id="uparrow" class="arrow';
	if (curpage === numpages) output += ' unavailable';
	output += '"><a href="javascript:;">&raquo;</a></li>';
    }
    output += '</ul>';
    return output;
};

leaguecreateerror = function() {
    return '<h2>ERROR</h2><p>Sorry, but there was a problem creating your mini-league.</p>';
}

leaguecreated = function(league) {
    var output = '<h2>LEAGUE CREATED</h2><p>Congratulations!  Your new league is now up and running.  To allow your friends to join, they\'ll need the code given below to gain access.<p><div class="callout panel">'
    output += league._id;
    output += '</div>'
    return output;
}

beforeseasonstart = function() {
		seasonstart = SystemVars.findOne({Name: "seasonstart"});
		if (seasonstart && Session.get('date') && Session.get('date').getTime() < seasonstart.Value.getTime()) return true;
		else return false;
}