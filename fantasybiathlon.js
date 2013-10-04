var FantasyTeams = new Meteor.Collection("fantasyteams");
var Athletes = new Meteor.Collection("athletes");
var userid = 1;

if (Meteor.isClient) {
    console.log(userid);
    console.log(Athletes.findOne({Nat: "NOR"}));
    console.log(FantasyTeams.findOne({UserID: userid}));
    Template.teamname.team = function() {
	console.log(userid);
	console.log(FantasyTeams.findOne({UserID: userid}));
	return FantasyTeams.findOne({UserID: userid});
    };
    Template.team.teamdeets = function() {
	return FantasyTeams.findOne({UserID: userid});
    };
    Template.team.athletes = function() {
	return FantasyTeams.findOne({UserID: userid}, function(err, thisteam) {
	    return getathletes(thisteam.Athletes);
	});
    };
    Template.hello.greeting = function () {
	return "Welcome to fantasybiathlon.";
  };

  Template.hello.events({
    'click input' : function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
	console.log("You pressed the button");
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}

function getathletes(ibuarray) {
    var athletearray = [];
    for (var i = 0; i < ibuarray.length; i++) {
	athletearray.push(Athletes.findOne({IBUId: ibuarray[i]}));
    }
    return athletearray;
}
