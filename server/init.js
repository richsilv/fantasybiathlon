
Meteor.startup(function () {
	Accounts.emailTemplates.from = 'admin <noreply@biathlonstats.eu>';
	process.env.MAIL_URL = 'smtp://richsilv:b3b8eb83@smtp.webfaction.com:25'
});

Accounts.validateNewUser(function (user) {
	var thatemail = Meteor.users.findOne({"emails.address":user.email});
  	if (thatemail) throw new Meteor.Error(403, "Email already registered");
    else return true;
});

Accounts.onCreateUser(function(options, user) {
	console.log(user);
	Accounts.sendVerificationEmail(user._id);
	var newteam = {UserID: user._id,
		Name: "My Team",
		transfers: 0,
		Athletes: ['DUMMY', 'DUMMY', 'DUMMY', 'DUMMY'],
		teamHistory: []
	};
	FantasyTeams.insert(newteam);
	if (options.profile) user.profile = options.profile;
	return user;
});

FantasyTeams.find().observe({
	changed: function(newdoc, olddoc) {
		var changes = 0;
		for (var i = 0; i < 4; i++) {
			if (newdoc.Athletes.indexOf(olddoc.Athletes[i]) === -1) changes += 1;
		}
		seasonstart = SystemVars.findOne({Name: "seasonstart"}).Value;
		if ((new Date()).getTime() < seasonstart.getTime()) FantasyTeams.update(newdoc, {$inc: {transfers: -changes}});
	}
});

writepopularathletes();
//    console.log(averageperformance());
//    updatepointstable();
//    removefloatingteams();
//    for (var i = 0; i < 1000; i++) {
//	var t = randomteam(seasonStart, makeDate);
//	t.UserID = i;
//	FantasyTeams.insert(t, function() {
//	    console.log("Inserted team " + (i) + ": " + t.Name);
//	});
//    }

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
Meteor.publish("statistics", function() {
	return Statistics.find();
});
Meteor.publish("systemvars", function() {
	return SystemVars.find();
});
Meteor.publish("minileagues", function(userid) {
//	return Minileagues.find({userid: userid});
return Minileagues.find();
});
SystemVars.allow({
	insert: function(userId) {
		return Meteor.users.findOne({_id: userId}).admin;
	},
	update: function(userId) {
		return Meteor.users.findOne({_id: userId}).admin;
	},
	remove: function(userId) {
		return Meteor.users.findOne({_id: userId}).admin;
	}
});
FantasyTeams.allow({
	insert: function(userId, doc) {
		if (doc.admin === true) return false;
		return (doc.UserID === userId);
	},
	update: function(userId, doc, fields) {
		if (_.contains(fields, 'admin')) return false;
		return (doc.UserID === userId);
	},
	remove: function(userId, doc) {
		return (doc.UserID === userId);
	}
});
Minileagues.allow({
	insert: function(userId, doc) {
		return (doc.Admin === userId);
	},
	update: function(userId, doc, fields) {
		if (fields.length !== 1 || fields[0]  === 'Teams') return true;
		else return false;
	},
	remove: function(userId, doc) {
		return (doc.Admin === userId);
	}
});


function popular() {
    var ids = [];
    var teams = FantasyTeams.find();
    if (!teams) return [[], []];
    var numteams = FantasyTeams.find().count();
    teams.forEach(function(t) {
	ids = ids.concat(t.Athletes.map(function(a) {return a.IBUId;}));
    });
    idsobj = {};
    ids.forEach(function(i) {
	if (i && i !== "DUMMY") {
	    if (Object.keys(idsobj).indexOf(i) === -1) idsobj[i] = 1;
	    else idsobj[i] += 1;
	}
    });
    var popids = Object.keys(idsobj).sort(function(a, b) { return idsobj[a] > idsobj[b] ? -1 : 1; }).slice(0, 20);
    var teamcount = [];
    var names = [];
    popids.forEach(function(i) {
	names.push(Athletes.findOne({IBUId: i}).ShortName);
	teamcount.push(idsobj[i] * 100 / numteams);
    });
    return [names, teamcount];
}

function writepopularathletes() {
    var popathletes = popular();
    Statistics.upsert({Type: "popular"}, {Type: "popular", Data: popathletes}, {}, function(err) {
	if (!err) console.log("Popular athletes written");
	else console.log("Error writing popular athletes: " + err);
    });
}
