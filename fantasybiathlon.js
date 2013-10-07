FantasyTeams = new Meteor.Collection("fantasyteams");
Athletes = new Meteor.Collection("athletes");
Races = new Meteor.Collection("races");
Meetings = new Meteor.Collection("meetings");
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
    var ath = Athletes.find({});
    console.log("this is it: " + Object.getOwnPropertyNames(ath));
    // code to run on server at startup
}

if (Meteor.isClient) {
    $(document).ready(function() {
	$(document).foundation();

	$('#natdropdown').change(function() {
	    Session.set('natchoice', $(this).val());
	});
	$('#namefilter').change(function() {
	    Session.set('namechoice', $(this).val());
	});
	$('#mfradiomaster').click(function() {
	    Session.set('genderchoice', $(this).next('span').attr('id'));
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
	var thisteam = FantasyTeams.findOne({UserID: userid});
	if (thisteam) {return getathletes(thisteam.Athletes);}
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
	    return Session.get("athleteset");
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
	var a = Athletes.find();
	var athleteset = filterathletes(Session.get('genderchoice'), Session.get('natchoice'), Session.get('namechoice'));
	console.log(athleteset.length);
	Session.set("athleteset", athleteset);
    });

}

function getathletes(ibuarray) {
    var athletearray = [];
    for (var i = 0; i < ibuarray.length; i++) {
	athletearray.push(Athletes.findOne({IBUId: ibuarray[i]}));
    }
    return athletearray;
}

function filterathletes(gender, nation, name) {
    if (name) {name = name.toLowerCase();}
    var filter = {};
    if (gender !== "MW") {filter.Gender = gender;}
    if (nation !== "") {filter.Nat = nation;}
    var athletes = Athletes.find(filter);
    var finalset = [];
    athletes.forEach(function(ath) {
	if (ath.Name.toLowerCase().indexOf(name) > -1) {
	    finalset.push(ath);
	}
    });
    return finalset;
}
