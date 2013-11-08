var MyCron = new Cron();
MyCron.addJob(120000, function() {
	updatepointstable();
});


Meteor.startup(function () {
	Accounts.emailTemplates.from = 'admin <noreply@biathlonstats.eu>';
	process.env.MAIL_URL = 'smtp://richsilv:b3b8eb83@smtp.webfaction.com:25';
	updatepointstable();
});

if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") Accounts.config({sendVerificationEmail: true, forbidClientAccountCreation: false});

Accounts.validateNewUser(function (user) {
	var thatemail = Meteor.users.findOne({"emails.address":user.email});
  	if (thatemail) throw new Meteor.Error(403, "Email already registered");
    else return true;
});

Accounts.onCreateUser(function(options, user) {
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
Meteor.users.find().observeChanges({
	changed: function(id, fields) {
		if (fields.sendVerification) {
			Accounts.sendVerificationEmail(id);
			Meteor.users.update({_id: id}, {$unset: {sendVerification: false}});
		}
	}
})

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
		if (fields.length !== 1 || fields[0]  !== 'Teams') return false;
		else return true;
	},
	remove: function(userId, doc) {
		return (doc.Admin === userId);
	}
});
Meteor.users.allow({
	update: function(userId, doc, fields) {
		if (fields.length === 1 && fields[0] === 'sendVerification') return true;
	}
})


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