var maxPoints = 15;
var finishpoints = [0, 30, 25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
var relaypoints = [0, 15, 10, 8, 6, 4, 3, 2, 1];
var smallpoints = [0, 10, 7, 5, 3, 1];
var weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

try {

	SystemVars.upsert({Name: 'beforeseasonstart'}, {$set: {Value: beforeseasonstart()}});

	ServerLogs = new Meteor.Collection("serverlogs");
	SecureData = new Meteor.Collection("securedata");
	SentAddresses = new Meteor.Collection("sentaddresses");
	var remotestring = SecureData.findOne({Name: 'remotestring'}).Value;
	var facebooklocal = SecureData.findOne({Name: 'facebooklocal'}).Value;
	var facebookprod = SecureData.findOne({Name: 'facebookprod'}).Value;
	var emailString = SecureData.findOne({Name: 'emailString'}).Value;
	process.env.MAIL_URL = emailString;
	console.log(emailString);

	var MyCron = new Cron();
	MyCron.addJob(1, function() {
		updatepointstable();
		updatepointstable(true);
	});
	MyCron.addJob(15, function() {
		writepopularathletes();
		updateallpoints();
	});
	MyCron.addJob(60, function() {
		updateWeather();
		updateAthletePoints();		
	});
	MyCron.addJob(1440, function() {
/*		var date = new Date();
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
*/		FantasyTeams.update({transfers: {$gt: 4}}, {$set: {transfers: 4}}, {multi: true});
		SystemVars.upsert({Name: 'beforeseasonstart'}, {$set: {Value: beforeseasonstart()}});
	});
MyCron.addJob(720, function() {
	var date = new Date();
	var aveperf = averageperformance(date);
	console.log(aveperf);
	Statistics.upsert({Type: 'averagepoints'}, {$set: {Data: aveperf}});
});

/*//Test races
Races.remove({RaceId: 'BT1112SWRLCP06SWSP', EventId: 'BT1112SWRLCP06'});
Races.remove({RaceId: 'BT1314SWRLCP01SWIN', EventId: 'BT1314SWRLCP01'});
a = new Date(new Date().getTime() - 1770000);
console.log('Adding races at ' + a, a.getTime());
Races.insert({RaceId: 'BT1112SWRLCP06SWSP', EventId: 'BT1112SWRLCP06', StartTime: a});
Races.insert({RaceId: 'BT1314SWRLCP01SWIN', EventId: 'BT1314SWRLCP01', StartTime: a});
*/
//Add race chrons
var races = Races.find().fetch();
for (var i = 0; i < races.length; i++) {
	var raceend = (races[i].StartTime.getTime() / 1000) + 1800;
	if ((raceend * 1000) > new Date().getTime()) {
		addracechron(races[i].RaceId, raceend);
		console.log("Adding race chron for " + races[i].RaceId);
	}		
	else if (((raceend + 3600) * 1000) > new Date().getTime()) {
		addracechron(races[i].RaceId, (new Date().getTime() / 1000) + 10);
		console.log("Adding race chron for " + races[i].RaceId + " [delayed start]");
	}
}

function addracechron(raceid, raceend) {
	MyCron.addScheduleJob(parseFloat(raceend), function() {
		var thiscrawler = Meteor.setInterval(function() {
			console.log("trying " + raceid);
			var success = pullandstoreresults(raceid);
			console.log(new Date(), success);
			if (success) {
				Meteor.clearInterval(thiscrawler);
				decorateResults();
				updateallpoints();
				addNewAthletes();
			}
		}, 150000)	
	});
}

//Add transfer chrons
var enddates = SystemVars.findOne({Name: 'meetingenddates'}).Value;
var startdates = SystemVars.findOne({Name: 'meetingstartdates'}).Value;
for (var i = 0; i < enddates.length; i++) {
	MyCron.addScheduleJob(enddates[i].getTime()/1000, function() {
		FantasyTeams.update({}, {$inc: {transfers: 2}}, {multi: true});
		FantasyTeams.update({transfers: {$gt: 4}}, {$set: {transfers: 4}}, {multi: true});
		console.log("Transfers added");
	});
}
for (var i = 0; i < startdates.length; i++) {
	MyCron.addScheduleJob((startdates[i].getTime()/1000), function() {
		var date = new Date(), baseDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()), startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()-6);
		var futuredate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
		var meeting = Meetings.findOne({StartDate: {$gt: date, $lt: futuredate}});
		if (meeting) {
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
				if (users[j].emails) {
					var thisItem = SentAddresses.findOne({address: users[j].emails[0].address, date: {$lte: baseDate, $gte: startDate}});
					if (!thisItem) {
//						Email.send({from: 'Fantasy Biathlon <noreply@biathlonstats.eu>', to: users[j].emails[0].address, subject: "Biathlon meeting coming up in " + meeting.Organizer, html: emailcontent});
						SentAddresses.insert({address: users[j].emails[0].address, date: baseDate});
					}
				}
			}
		}
	});
}

function showChrons() {
	return MyCron;
}

Meteor.startup(function () {
	Accounts.emailTemplates.from = 'admin <noreply@biathlonstats.eu>';
//	if (Meteor.absoluteUrl().slice(0,22) !== "http://localhost:3000/") process.env.MAIL_URL = emailString;
//	else process.env.MAIL_URL = null;

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
});

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
		var seasonStart = SystemVars.findOne({Name: 'seasonstart'}).Value;
		var res = getresults(team, date);
		var ys = [seasonStart];
		var zs = [seasonStart.getDay() + '/' + seasonStart.getMonth() + '/' + (seasonStart.getYear() % 100)]
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
			console.log(r);
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
		if (names.length > 6) {
			otherpoints = 0;
			for (var i = names.length; i > 5; i--) {
				names.pop();
				otherpoints += points.pop();
			}
			names.push("Others");
			points.push(otherpoints);
		}
		return [names, points];
	},
	getresults: function(team, date, olympic) {
		return getresults(team, date, olympic);
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
		else if (args instanceof Array) {
			var argstring = '"' + args[0] + '"';
			for (i = 1; i < args.length; i++) argstring += ', "' + args[i] + '"';
			return eval(fn + '(' + argstring + ')');
		}
		else {
			var argstring = '"' + args + '"';
			return eval(fn + '(' + argstring + ')');
		}
	},
	crawlResults: function(password, raceId) {
		if (password !== remotestring) return false;
		var success = pullandstoreresults(raceId);
		if (success) {
			decorateResults();
			updateallpoints();
			addNewAthletes();
		}
		return success;
	},
	missingAnalysisCheck: function() {
		var missing = {}
		Results.find({CourseRank: {$exists: false}}).forEach(function(r) {if (!(r.RaceId in missing)) missing[r.RaceId] = 1; else missing[r.RaceId]++;});
		var whiteList = _.filter(_.keys(missing), function(raceId) {return missing[raceId] >= 10;});
		return _.pick(missing, whiteList);
	},
	sendMailOn: function() {
		process.env.MAIL_URL = emailString;
	}
});

Accounts.validateNewUser(function (user) {
	return true;
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
Meteor.users.find().observeChanges({
	added: function(id, fields) {
		if (!FantasyTeams.findOne({UserID: id})) {
			var beforeseasonstart = SystemVars.findOne({Name: 'beforeseasonstart'});
			var transfers = (beforeseasonstart && beforeseasonstart.Value) ? 2 : 6;
			var newteam = {UserID: id,
				Name: "My Team",
				transfers: transfers,
				Athletes: ['DUMMY', 'DUMMY', 'DUMMY', 'DUMMY'],
				teamHistory: [],
				Nat: fields.profile.Nat
			};
			var newteam = FantasyTeams.insert(newteam);
			ServerLogs.insert({Type: "New", TeamID: newteam , UserID: id, Time: new Date()})
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
});
Meteor.publish("locations", function() {
	return Locations.find();
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
});
ErrorLogs.allow({
	insert: function() {
		return true;
	}
});

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
	var prices = [];
	popids.forEach(function(i) {
		athvar = Athletes.findOne({IBUId: i});
		if (athvar) {
			names.push(athvar.ShortName + '(' + athvar.Points + ')');
			teamcount.push(idsobj[i] * 100 / numteams);
			prices.push(athvar.Price);
		}
	});
	return [names, teamcount, prices];
}

function writepopularathletes() {
	var popathletes = popular();
	console.log(popathletes);
	Statistics.upsert({Type: "popular"}, {$set: {Data: popathletes}}, {}, function(err) {
		if (!err) {
			ServerLogs.insert({Type: "Message", Message: "Popular athletes written", Time: new Date()});
		}	
		else {
			ServerLogs.insert({Type: "Message", Message: "Error writing popular athletes: " + err, Time: new Date()});
		}
	});
}

/*function getresults(team, enddate, olympic) {
	var compfunc = function(a, b) {
		return a.RaceTime > b.RaceTime ? 1 : a.RaceTime < b.RaceTime ? -1 : 0;
	}, resultFilter;
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
		resultFilter = {IBUId: {$in: team.teamHistory[i][0]}, RaceTime: {$lt: dtend, $gte: dtstart}};
		if (olympic) resultFilter['EventId'] = 'BT1314SWRLOG__';
		results = results.concat(Results.find(resultFilter).fetch());
	}
	return results.sort(compfunc);
}*/

function updatepointstable(olympic) {
	var teams = FantasyTeams.find();
	var tableobj = {Table: []};
	var enddate = new Date();
	teams.forEach(function(t) {
		var res = getresults(t, enddate, olympic);
		var p = res.reduce(function(tot, r) {return tot + (r.Points ? r.Points : 0);}, 0);
		tableobj.Table.push({Name: t.Name,
			Nat: t.Nat,
			ID: t._id,
			Points: p
		});
	});
	if (olympic) 
		Statistics.upsert({Type: "olympictable"}, {Type: "olympictable", Data: tableobj}, {}, function(err) {
			if (!err) console.log("Olympic table updated");
			else console.log("Error writing Olympic table: " + err);
		});
	else
		Statistics.upsert({Type: "pointstable"}, {Type: "pointstable", Data: tableobj}, {}, function(err) {
			if (!err) console.log("Points table updated");
			else console.log("Error writing points table: " + err);
		});
}

function getresults(team, enddate, olympic) {
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
		var query = {IBUId: {$in: team.teamHistory[i][0]}, RaceTime: {$lt: dtend, $gte: dtstart}};
		if (olympic) query['EventId'] = "BT1314SWRLOG__";
		results = results.concat(Results.find(query).fetch());
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
	console.log("THIS======================================");
	console.log(error.stack);
	ServerLogs.insert({Type: "Error", Message: error.stack, Time: new Date()});
}

pullandstoreresults = function(raceid) {
	Results.remove({RaceId: raceid});
	var analysis, params, success = true, apiurl = SecureData.findOne({Name: 'APIURL'}).Value;;
	var eventid = Races.findOne({RaceId: raceid}) ? Races.findOne({RaceId: raceid}).EventId : '';
	if (eventid) {
		params = {'EventId': eventid, '_': 1359993916314, 'callback': ''};
		var racedata = HTTP.get(apiurl + 'Competitions', {params: params}).data;
		if (!racedata.length) {
			ServerLogs.insert({Type: "Error", Message: "No race data: " + raceid, Time: new Date()});
			success = false;
		}
		racedata.forEach(function(race) {
			if (race.RaceId === raceid) {
				if (!Boolean(race.HasAnalysis)) {
					ServerLogs.insert({Type: "Message", Message: "Still waiting for analysis: " + raceid, Time: new Date()});
					success = false;
				}
			}
		});
	}
	else {
		ServerLogs.insert({Type: "Error", Message: "No Races entry for race: " + raceid, Time: new Date()});
		success = false;
	}
	if (!success) return false
	console.log("now crawling...")
	params = { RaceId: raceid, _: 1359993916314, callback: ''};
	var results = HTTP.get(apiurl + 'Results', {params: params}).data;
	for (var i=0; i < results.Results.length; i++) {
		results.Results[i].RaceId = results.RaceId;
		results.Results[i].EventId = eventid;
		results.Results[i].ShootingTotal = parseInt(results.Results[i].ShootingTotal, 10);
		results.Results[i].Shootings = getnumbers(results.Results[i].Shootings);
		results.Results[i].TotalTime = timetosecs(results.Results[i].TotalTime);
		results.Results[i].Behind = timetosecs(results.Results[i].Behind);
		results.Results[i].Rank = parseInt(results.Results[i].Rank, 10);
		if (isNaN(results.Results[i].Rank)) { results.Results[i].Rank = 999; }
		if (isNaN(results.Results[i].TotalTime)) { results.Results[i].TotalTime = 86399; }
		if (isNaN(results.Results[i].ShootingTotal)) { results.Results[i].ShootingTotal = -1; }
	}
	async.each(results.Results, function(res, cb) {
		console.log(res.IBUId);
		params = { RaceId: raceid, IBUId: res.IBUId, RT: 340203, _: 1359993916314, callback: ''};
		analysis = HTTP.get(apiurl + 'Analysis', {params: params}).data.Values;
		for (var i=0; i < analysis.length; i++) {
			if (analysis[i].FieldId === 'STTM') {
				res.ShootTime = timetosecs(analysis[i].Value);
				res.ShootRank = parseInt(analysis[i].Rank, 10);
				if (isNaN(res.ShootRank)) {res.ShootRank = 999;}
			}
			else if (analysis[i].FieldId === 'FINN') {
				res.TotalRank = parseInt(analysis[i].Rank, 10);
				if (isNaN(res.TotalRank)) {res.TotalRank = 999;}
			}
			else if (analysis[i].FieldId === 'A0TR') {
				res.RangeTime = timetosecs(analysis[i].Value);
				res.RangeRank = parseInt(analysis[i].Rank, 10);
				if (isNaN(res.RangeRank)) {res.RangeRank = 999;}
			}
			else if (analysis[i].FieldId === 'A0TC') {
				res.CourseTime = timetosecs(analysis[i].Value);
				res.CourseRank = parseInt(analysis[i].Rank, 10);
				if (isNaN(res.CourseRank)) {res.CourseRank = 999;}
			}
		}
		Results.upsert({RaceId: raceid, IBUId: res.IBUId}, {$set: res});
		cb(null);
	}, function(err) {});
	if (success) {
		ServerLogs.insert({Type: "Message", Message: "Race results crawled: " + raceid, Time: new Date()});
		return raceid;
	}
	else return false;
};

function getnumbers(string) {
	var re = /[0-9]/g;
	var matches = [];
	var match;
	while(true) {
		match = re.exec(string);
		if (match !== null) { matches.push(parseInt(match[0], 10)); }
		else { break; }
	}
	return matches;
}

function timetosecs(string) {
	if (string === null) {return 86399;}
	timearray = string.replace('+','').split(':');
	time = 0;
	for (var i = 0; i < timearray.length; i++) {
		time += parseFloat(timearray[timearray.length - i - 1]) * Math.pow(60, i);
	}
	return time;
}

function decorateResults(force) {
    var shootingscore = function(err, results) {
		results.forEach(function(r, i) {
		    console.log('record number ' + i);
		    if (r.RangeTime && typeof r.ShootingTotal != 'undefined') {
				Result.update(r, {ShootScore: r.RangeTime + (r.ShootingTotal * 1000)}, {}, function(err, num) {
				    if (!err) console.log('Record updated: ' + r.RaceId + ', ' + r.IBUId);
				    else console.log(err);
				});
		    }
		});
    };
    var reslist
    reslist = Results.find({IBUId: {$exists: false}});
    reslist.forEach(function(r) {
    	ath = Athletes.findOne({Name: r.Name});
    	if (ath) {
    		Results.update(r, {$set: {IBUId: ath.IBUId}});
    	}
    });
    if (force) reslist = Results.find();
    else reslist = Results.find({ShootScore: {$exists: false}});
    reslist.forEach(function(r) {
	    if (r.RangeTime && typeof r.ShootingTotal != 'undefined') {
			Results.update(r, {$set: {ShootScore: r.RangeTime + (r.ShootingTotal * 1000)}});
		}
    });
    if (force) reslist = Results.find();
    else reslist = Results.find({RaceTime: {$exists: false}})
    reslist.forEach(function(r) {
    	race = Races.findOne({RaceId: r.RaceId});
    	if (race) Results.update(r, {$set: {RaceTime: race.StartTime}});
    });	
};


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
	if (r.EventId === "BT1314SWRLOG__") points = points * 2;
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

function addNewAthletes() {
	var newath, absent = [];
	Results.find().forEach(function(r) {
		if(absent.indexOf(r.IBUId) === -1 && r.IBUId.trim().length > 14 && !Athletes.findOne({IBUId: r.IBUId})) 
			{
				newath = {
					IBUId: r.IBUId,
					ShortName: r.ShortName,
					Name: r.Name,
					Nat: r.Nat,
					Gender: r.RaceId.slice(15,16),
					Price: 1.0
					};
				ServerLogs.insert({Type: "Athlete", Data: newath, Time: new Date()});
				Athletes.insert(newath);
				absent.push([r.IBUId, r.ShortName]);
			}
	});
	return absent;
}

function cleanLogs(cleanDate) {
	if (!cleanDate) {
		var d = new Date();
		cleanDate = new Date(d.getTime() - (24 * 60 * 60 * 1000));
	}
	return ServerLogs.remove({Time: {$lt: cleanDate}}); 
}

function updateWeather() {
	var locs = Locations.find()
	locs.forEach(function(l) {
		res = HTTP.get('http://api.openweathermap.org/data/2.5/weather', {params: {lat: l.Location[0], lon: l.Location[1]}});
		if (res.statusCode === 200) {
			Locations.update({Name: l.Name}, {$set: {Weather: res.data}});
		}
		else ServerLogs.insert({Type: "Weather", Message: 'Could not get data for ' + l.Name, Time: new Date()});
	})
}

function updateAthletePoints() {
	var now = new Date();
	Athletes.find().forEach(function(ath) {
		var pts = Meteor.call('getplayerpoints', ath.IBUId, now);
		Athletes.update(ath, {$set: {Points: pts}});
	});
}
