if (Meteor.isClient) {

    $(document).ready(function() {
	$('.button').click(function(event) {
	    $(this).parents('.topbar').next('.dropbar').slideToggle();
	});
    });

}
