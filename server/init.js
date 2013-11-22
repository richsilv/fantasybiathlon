try {

SystemVars.upsert({Name: 'beforeseasonstart'}, {$set: {Value: beforeseasonstart()}});

ServerLogs = new Meteor.Collection("serverlogs");
SecureData = new Meteor.Collection("securedata");
var remotestring = SecureData.findOne({Name: 'remotestring'}).Value;
var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;

var MyCron = new Cron();
MyCron.addJob(1, function() {
	updatepointstable();
});
MyCron.addJob(15, function() {
	writepopularathletes();
});
MyCron.addJob(1440, function() {
	var date = new Date();
	var enddates = SystemVars.findOne({Name: 'meetingenddates'}).Value;
	var startdates = SystemVars.findOne({Name: 'meetingstartdates'}).Value;
	for (var i = 0; i < enddates.length; i++) {
		if (enddates[i].getTime() == new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) {
			FantasyTeams.update({}, {$inc: {transfers: 2}}, {multi: true});
			console.log("Transfers added");
		}
	}
	for (var i = 0; i < startdates.length; i++) {
		if (startdates[i].getTime() == new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()) {
			var futuredate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
			var meeting = Meetings.findOne({StartDate: {$gt: date, $lt: futuredate}});
			var races = Races.find({StartTime: {$gt: date, $lt: futuredate}}).fetch();
			var emailcontent = '<h3>Biathlon meeting at ' + meeting.Organizer + '</h3>';
			emailcontent += '<p>The next biathlon meeting is coming up fast!  Here are the races coming up over the next few days:</p><table>'
			for (k = 0; k < races.length; k++) {
				emailcontent += '<tr><td>' + races[k].Description + '</td><td>' + races[k].StartTime + '</td></tr>';
			}
			emailcontent += '</table><p>Don\'t forget to make any transfers well before the start of the race to make sure they\'re registered in time!<p>';
			emailcontent += '<p>You can always check your team, points, transfers and the league table at <a href="http://fantasybiathlon.meteor.com">FantasyBiathlon.Meteor.Com</a>.</p>';
			var users = Meteor.users.find({'emails.verified': true}, {fields: {emails: true}}).fetch();
			for (var j = 0; j < users.length; j++) {
				if (users[j].emails) Email.send({from: 'Fantasy Biathlon <noreply@biathlonstats.eu>', to: users[j].emails[0].address, subject: "Biathlon meeting coming up in " + meeting.Organizer, html: emailcontent});
			}
		}
	}
	FantasyTeams.update({transfers: {$gt: 4}}, {$set: {transfers: 4}}, {multi: true});
	SystemVars.upsert({Name: 'beforeseasonstart'}, {$set: {Value: beforeseasonstart()}});
});
MyCron.addJob(720, function() {
	var date = new Date();
	var aveperf = averageperformance(date);
	console.log(aveperf);
	Statistics.upsert({Type: 'averagepoints'}, {$set: {Data: aveperf}});
});

Meteor.startup(function () {
	Accounts.emailTemplates.from = 'admin <noreply@biathlonstats.eu>';
	if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") process.env.MAIL_URL = 'smtp://richsilv:b3b8eb83@smtp.webfaction.com:25';
});

Accounts.loginServiceConfiguration.remove({
	service: "facebook"
});

if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") {
	Accounts.config({sendVerificationEmail: true, forbidClientAccountCreation: false});
	Accounts.loginServiceConfiguration.insert(facebookprod);
}
else {
	Accounts.loginServiceConfiguration.insert(facebooklocal);	
}

Meteor.methods({
/*	// DISABLE THIS IMMEDIATELY!!!!!!!!
	givetransfers: function() {
		var date = new Date();
		var enddates = SystemVars.findOne({Name: 'meetingenddates'}).Value;
		FantasyTeams.update({}, {$inc: {transfers: 2}}, {multi: true});
		console.log("Transfers added");
		FantasyTeams.update({transfers: {$gt: 4}}, {$set: {transfers: 4}}, {multi: true});
	},
*/
	teamPoints: function (team, date) {
		var res = getresults(team, date);
		var output =  res.reduce(function(tot, r) {return tot + (r.Points ? r.Points : 0);}, 0);
		return output;
	},
	getpopular: function() {
		return Statistics.findOne({Type: "popular"}).Data;
	},
	chartdata: function(team, date) {
		var seasonStart = SystemVars.findOne({Name: 'seasonstart'});
		var res = getresults(team, date);
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
	},
	bestathletes: function(date) {
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
	},
	contributions: function(team, date) {
		var compfunc = function(a, b) {return pointsobj[a] > pointsobj[b] ? -1 : 1;};
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
	},
	getresults: function(team, date) {
		return getresults(team, date);
	},
	getplayerresults: function(ibuid, date) {
		return Results.find({IBUId: ibuid, RaceTime: {$lte: date}});
	},
	getplayerpoints: function(ibuid, date) {
		results = Results.find({IBUId: ibuid, RaceTime: {$lte: date}});
		return results.fetch().reduce(function(tot, res) {return tot + (res.Points ? res.Points : 0);}, 0);
	},
	runfunction: function(password, fn, args) {
		if (password !== remotestring) return false;
		if (!args) return eval(fn + '()');
		else {
			var argstring = args[0];
			for (i = 1; i < args.length; i++) argstring += ', ' + args[i];
			return eval(fn + '(' + argstring + ')');
		}
	}
});

Accounts.validateNewUser(function (user) {
	var thatemail = Meteor.users.findOne({"emails.address":user.email});
	if (thatemail) throw new Meteor.Error(403, "Email already registered");
	else return true;
});

Accounts.onCreateUser(function(options, user) {
	if (options.profile) user.profile = options.profile;
	if (user.services.facebook) {
		var natlookup = SystemVars.findOne({Name: 'localities'});
		user.emails = [{address: user.services.facebook.email, verified: true}];
		if (natlookup) user.profile.Nat = natlookup.Value[user.services.facebook.locale] ? natlookup.Value[user.services.facebook.locale] : 'ZZZ';
		else user.profile.Nat = 'ZZZ';
		user.profile.facebook = true;
	}
	var beforeseasonstart = SystemVars.findOne({Name: 'beforeseasonstart'});
	var transfers = (beforeseasonstart && beforeseasonstart.Value) ? 2 : 6;
	var newteam = {UserID: user._id,
		Name: "My Team",
		transfers: transfers,
		Athletes: ['DUMMY', 'DUMMY', 'DUMMY', 'DUMMY'],
		teamHistory: [],
		Nat: user.profile.Nat
	};
	FantasyTeams.insert(newteam);
	return user;
});

FantasyTeams.find().observe({
	changed: function(newdoc, olddoc) {
		var changes = 0;
		for (var i = 0; i < 4; i++) {
			if (newdoc.Athletes.indexOf(olddoc.Athletes[i]) === -1) changes += 1;
		}
		seasonstart = SystemVars.findOne({Name: "seasonstart"}).Value;
		if (!beforeseasonstart()) FantasyTeams.update(newdoc, {$inc: {transfers: -changes}});
	}
});
Meteor.users.find().observeChanges({
	changed: function(id, fields) {
		if (fields.sendVerification) {
			Accounts.sendVerificationEmail(id);
			Meteor.users.update({_id: id}, {$unset: {sendVerification: false}});
		}
	}
});
Minileagues.find().observeChanges({
	added: function(id, fields) {
		if (fields.sendCode) {
			var user = Meteor.users.findOne({_id: fields.Admin});
			if (user && user.emails) {
				Email.send({from: 'admin <noreply@biathlonstats.eu>', to: user.emails[0].address, subject: "Your Fantasy Biathlon MiniLeague Code",
					html: "<p>Here's the code you need to send to your friends to allow them to sign up to your MiniLeague, <strong>" + fields.Name + "</strong>:</p><h3>" + id + "</h3>"})
			}
			Minileagues.update({_id: id}, {$unset: {sendCode: false}});
		}
	}
})

writepopularathletes();
/*    console.log(averageperformance());
    updatepointstable();
    removefloatingteams();
    for (var i = 0; i < 1000; i++) {
	var t = randomteam(seasonStart, makeDate);
	t.UserID = i;
	FantasyTeams.insert(t, function() {
	    console.log("Inserted team " + (i) + ": " + t.Name);
	});
    } */

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
	var team = FantasyTeams.find({UserId: this.userId});
	return getresults(team);
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
Meteor.publish("minileagues", function(teamid) {
	return Minileagues.find({Teams: teamid});
});
Meteor.publish("allminileagues", function(leagueid) {
	if (leagueid) return Minileagues.find({_id: leagueid});
	else this.stop();
})
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
	var athvar;
	var ids = [];
	var teams = FantasyTeams.find();
	var numteams = FantasyTeams.find().count();
	if (!numteams) return [[], []];
	teams.forEach(function(t) {
		ids = ids.concat(t.Athletes);
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
		athvar = Athletes.findOne({IBUId: i});
		if (athvar) {
			names.push(Athletes.findOne({IBUId: i}).ShortName);
			teamcount.push(idsobj[i] * 100 / numteams);
		}
	});
	return [names, teamcount];
}

function writepopularathletes() {
	var popathletes = popular();
	Statistics.upsert({Type: "popular"}, {$set: {Data: popathletes}}, {}, function(err) {
		if (!err) {
			ServerLogs.insert({Type: "Message", Message: "Popular athletes written", Time: new Date()});
		}	
		else {
			ServerLogs.insert({Type: "Message", Message: "Error writing popular athletes: " + err, Time: new Date()});
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

function updatepointstable() {
	var teams = FantasyTeams.find();
	var tableobj = {Table: []};
	var enddate = new Date();
	teams.forEach(function(t) {
		var res = getresults(t, enddate);
		var p = res.reduce(function(tot, r) {return tot + (r.Points ? r.Points : 0);}, 0);
		tableobj.Table.push({Name: t.Name,
			Nat: t.Nat,
			ID: t._id,
			Points: p
		});
	});
	Statistics.upsert({Type: "pointstable"}, {Type: "pointstable", Data: tableobj}, {}, function(err) {
		if (!err) console.log("Points table updated");
		else console.log("Error writing points table: " + err);
	});
}

function getresults(team, enddate) {
	var compfunc = function(a, b) {
		return a.RaceTime > b.RaceTime ? 1 : a.RaceTime < b.RaceTime ? -1 : 0;
	};
	enddate = enddate ? enddate : new Date();
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
			else dtend = new Date();
		}
		results = results.concat(Results.find({IBUId: {$in: team.teamHistory[i][0]}, RaceTime: {$lt: dtend, $gte: dtstart}}).fetch());
	}
	return results.sort(compfunc);
}

function averageperformance(enddate) {
	if (!enddate) enddate = new Date();
	var races = Races.find({StartTime: {$lte: enddate}}).fetch();
	var teamnum = FantasyTeams.find().count();
	var dates = [];
	var avg = [];
	var aths;
	var total;
	for (var i = 0; i < races.length; i++) {
			console.log(races[i].RaceId);
			total = 0;
			FantasyTeams.find().forEach(function(team) {
				if (team.teamHistory.length) aths = team.teamHistory.reduce(function(pre, cur) {
					return (cur[1] > pre[1] && cur[1] <= races[i].StartTime) ? cur : pre;
				});
				else aths = [[], []];
				total += Results.find({RaceId: races[i].RaceId, IBUId: {$in: aths[0]}}).fetch().reduce(function(tot, r) {
					return tot + r.Points;
				}, 0);
			});
			dates.push(races[i].StartTime);
			avg.push(avg[avg.length - 1] + (total / teamnum));
	}
	return [dates, avg];
}


function beforeseasonstart() {
	var seasonstart = SystemVars.findOne({Name: "seasonstart"});
	var date = new Date();
	if (date.getTime() < seasonstart.Value.getTime()) return true;
	else return false;
}

}

catch(error) {
	ServerLogs.insert({Type: "Error", Message: error.stack, Time: new Date()});
}