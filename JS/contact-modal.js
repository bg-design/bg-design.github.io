	var leftValue = $('#submit').css( "left" );
	var rightPercent = $('#submit').css( "right" );
	// var rightPercent = rightPercent.slice(0, -1);
	var windowWidth = $( window ).width();

function submitPadding() {

	var modalWidth = $('.modal-content').width();
	var rightOffset = windowWidth / 10;
	console.log('rightOffset'+rightOffset+'rightPercent'+rightPercent);
	var rightValue = (rightPercent/100) * modalWidth + rightOffset-150;
	var messageLength = $('#message').val().length;
	var companyLength = $('#company').val().length;
	var roleLength = $('#role').val().length;
	var nameLength = $('#name').val().length;
	var emailLength = $('#email').val().length;
	var totalLength = nameLength + companyLength + roleLength + emailLength + messageLength;
	console.log('totalLength:'+totalLength);
	// var newLeftValue = (totalLength * ) + 100;
	var newRightValue = rightValue - (totalLength*4);
	console.log('newRightValue:'+newRightValue+', messageLength:'+messageLength);


	if (newRightValue > 0) {
		$('#submit').css("right",newRightValue + "px");
		$('#submit').removeClass("footer-lock");
		$('#submit').css("top", "350px");
	}
	else {
		$('#submit').css("right","0");
		$('#submit').addClass("footer-lock");
		$('#submit').css("top","unset");
	}
	 console.log('companyLength:'+companyLength+', nameLength'+nameLength);
		if (messageLength > 49 && nameLength > 2 && companyLength > 2) {
			$('.submit').addClass("submit-ready")
		}
		else {
			$('.submit').removeClass("submit-ready");
		 };
};

function hideSubmit() {
	$('#submit').css("display", "none");
}


	// SCRIPT SO ENTER TABS TO NEXT FIELD
jQuery.extend(jQuery.expr[':'], {
    focusable: function (el, index, selector) {
        return $(el).is('a, button, :input, [tabindex]');
    }
});

$(document).on('keydown', ':focusable', function (e) {
    if (e.which == 13) {
        e.preventDefault();
        // Get all focusable elements on the page
        var $canfocus = $(':focusable');
        var index = $canfocus.index(this) + 1;
        if (index >= $canfocus.length) index = 0;
        $canfocus.eq(index).focus();
    }
});

	$(function(){
    	$("#name").focus();
	});


	// MODAL
	// Get the modal
var modal = document.getElementById('myModal');

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal 
btn.onclick = function() {
    modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
    modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
 