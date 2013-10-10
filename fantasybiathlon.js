FantasyTeams = new Meteor.Collection("fantasyteams");
Athletes = new Meteor.Collection("athletes");
Races = new Meteor.Collection("races");
Meetings = new Meteor.Collection("meetings");
ThisTeam = new Meteor.Collection();

var systemDate = new Date(2013, 01, 11);

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
}

if (Meteor.isClient) {
    var thisteam = null;
    Session.set('natchoice', undefined);
    Session.set('namechoice', '');
    Session.set('genderchoice', 'MW');
    $(document).ready(function() {
	$(document).foundation();

	$('#teamdisplay').on('click', '.teammember', function() {
	    console.log("drop");
	    $('#teamdrop').slideToggle();
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
	var natlist = Athletes.find({})
	natlist.forEach(function(ath) {
	    if (nations.indexOf(ath.Nat) < 0) {
		nations.push(ath.Nat);
	    }		
	});
	return nations.sort();
    }
    
    Template.athletelist.helpers({
	athleteset: function() {
	    var ROWS = 8;
	    var aths = filterathletes(Session.get('genderchoice'), Session.get('natchoice'), Session.get('namechoice'));
	    var cols = Math.ceil(aths.length/ROWS);
	    var athtable = []
	    for (var i = 0; i < ROWS; i++) {athtable.push('<tr style="white-space:nowrap;">');}
	    for (var i = 0; i < aths.length; i++) {
		athtable[i % ROWS] += '<td class="tile radius label" id="' + aths[i].IBUId + '">' + aths[i].Name + ' (' + aths[i].Nat + ')</td>';
	    }
	    for (var i = 0; i < ROWS; i++) {athtable[i] += '</tr>';}
	    return athtable.join('');
	},
 	athlete: function() {
	    
	},
	render: function() {
	    return this.Name;
	},
	nations: function() {
	var nations = [];
	var natlist = Athletes.find({})
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
	GenderLong: function() {
	    if (this.Gender === "M") {return "Male";}
	    else {return "Female";}
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
	
}

function filterathletes(gender, nation, name) {
    if (name === undefined) {name='';}
    if (name) {name = name.toLowerCase();}
    var filter = {};
    if (gender !== undefined && gender !== "MW") {filter.Gender = gender;}
    if (nation !== undefined && nation !== "") {filter.Nat = nation;}
    var athletes = Athletes.find(filter);
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

