/*jshint smarttabs:true */
FantasyTeams = new Meteor.Collection("fantasyteams");
Athletes = new Meteor.Collection("athletes");
Races = new Meteor.Collection("races");
Meetings = new Meteor.Collection("meetings");
Nations = new Meteor.Collection("nations");
ThisTeam = new Meteor.Collection();

var systemDate = new Date(2013, 01, 11);
var maxPoints = 25;
var userid = 1;

if (Meteor.isServer) {
    Meteor.startup(function () {
	if (Athletes.find().count() === 0) {
	    Athletes.insert({Name: "John Smith", Nat: "ZZZ", Height: 175, Weight: 75, Gender: "M"});
	}
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
}

if (Meteor.isClient) {
    Session.set('cross', false);
    var thisteam = null;
    Session.set('natchoice', undefined);
    Session.set('namechoice', '');
    Session.set('genderchoice', 'MW');
    $(document).ready(function() {
	$(document).foundation();

	$('#teamdisplay').on('click', '.teammember', function(e) {
	    if (e.target.className !== 'cross') {
		$('#teamdrop').slideToggle();
		Session.set('cross', !Session.get('cross'));
	    }
	});
	$('#teamdisplay').on('click', '.cross', function() {
	    var team = Session.get('athletes');
	    if (team.indexOf($(this).attr('id')) > -1) {
		team[team.indexOf($(this).attr('id'))] = "DUMMY";
		Session.set('athletes', team);
	    }
	});
	$('#teamdrop').on('click', '.athlete', function() {
	    var team = Session.get('athletes');
	    var addpos = team.indexOf("DUMMY");
	    if (addpos > -1 && !$(this).children(':first').hasClass('unavailable')) {
		team[addpos] = $(this).children('span').attr('id');
		Session.set('athletes', team);
	    }
	});
	$('#teamdrop').on('click', '#resettransfers', function() {
	   ThisTeam.remove({});
	});
	$('#natdropdown').change(function() {
	    Session.set('natchoice', $(this).val());
	});
	$('#namefilter').on('keyup', function() {
	    Session.set('namechoice', $(this).val());
	});
	$('#mfradiomaster label').click(function() {
	    console.log($(this));
	    Session.set('genderchoice', $(this).children('span').attr('id'));
	});
    });

    var teamhandle = Meteor.subscribe("fantasyteams", userid, function () {
    });
    var athletehandle = Meteor.subscribe("athletes", function() {
    });
    var nationhandle = Meteor.subscribe("nations", function() {});

    Template.teamname.team = function() {
	return FantasyTeams.findOne({UserID: userid});
    };
    Template.team.teamdeets = function() {
	return FantasyTeams.findOne({UserID: userid});
    };
    Template.team.athletes = function() {
	if (ThisTeam.findOne()) {return getathletes(ThisTeam.findOne().Athletes);}
	else {return [];}
    };
    Template.athleteform.nations = function() {
	var nations = [];
	var natlist = Athletes.find({});
	natlist.forEach(function(ath) {
	    if (nations.indexOf(ath.Nat) < 0) {
		nations.push(ath.Nat);
	    }
	});
	return nations.sort();
    };
    Template.pricebox.teamprice = function() {
	return Session.get('teamprice');
    };
    Template.pricebox.pricetarget = function() {
	if (getteamprice(ThisTeam.findOne()) <= maxPoints) {
	    return "under";
	}
	else {
	    return "over";
	}
    };

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
			Session.get('teamprice') + aths[i].Price > maxPoints) {
			gender = "unavailable";
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
	}
    });

    Deps.autorun(function() {
	var thisteam = FantasyTeams.find({UserID: userid}).fetch();
	if (thisteam.length > 0 && ThisTeam.find().count() === 0) {
	    ThisTeam.insert(thisteam[0]);
	    Session.set('athletes', thisteam[0].Athletes);
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
