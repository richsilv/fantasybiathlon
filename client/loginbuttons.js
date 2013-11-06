Session.set('action', 'login');
Session.set('error', '');

Template.loginButtons.helpers({
	login: function() {
		return (Session.get('action') === 'login');
	},
	signup: function() {
		return (Session.get('action') === 'signup');
	},
	forgot: function() {
		return (Session.get('action') === 'forgot');
	},
	nations: function() {
		var nations = Nations.find().fetch();
		return nations;
	},
	error: function() {
		return Session.get('error');
	}
})

Template.loginButtons.events({
	'click #actionchoice>li': function(event) {
		console.log("click");
		if (event.currentTarget.id !== Session.get('action')) {
			Session.set('error', '');
			Session.set('action', event.currentTarget.id);
		}
	},
	'submit #login-form': function(event) {
		if (Session.get('action') === 'login') {
			Meteor.loginWithPassword({email: $('#login-email').val()}, $('#login-password').val(), function(err) {
				if (err) { 
					console.log(err);
					if (err.reason === "Incorrect password") Session.set('error', 'Incorrect password!');
					else Session.set('error', 'Cannot log you in!');
				}
			});
		}
		else if (Session.get('action') === 'signup') {
			var password = $('#login-password').val();
			if (password.length < 6) {
				Session.set('error', 'Password must be at least 6 characters long!')
				return false;
			}
			Accounts.createUser({email: $('#login-email').val(), password: $('#login-password').val(), profile: {Nat: $('#natdropdown').val()}}, function(err) {
				if (err){
					if (err.reason === "Email already exists.") Session.set('error', 'Email already registered!');
					else Session.set('error', 'Could not create user!');
					console.log(err);
				}
			});
		}
		else if (Session.get('action') === 'forgot') {
			Accounts.forgotPassword($('#login-email'), function(err) {
				if (err) console.log(err);
			});
			Session.set('error', 'Password reset mail sent.')
			return false;
		}
		return false;
	},
	'click #forgot': function(event) {
		Session.set('action', 'forgot');
	}
})