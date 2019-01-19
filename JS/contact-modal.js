
function submitPadding() {

	var nameLength = $('#RESULT_TextField-0').val().length;
	var companyLength = $('#RESULT_TextField-1').val().length;
	var roleLength = $('#RESULT_TextField-2').val().length;
	var emailLength = $('#RESULT_TextField-3').val().length;
	var messageLength = $('#RESULT_TextArea-5').val().length;
	var totalLength = nameLength + companyLength + roleLength + emailLength + messageLength;

	// console.log('messageLength:'+messageLength);
	// console.log('totalLength:'+totalLength);

	var offset = totalLength * 9;


	if (37 > totalLength > 0) {
		$('.submit').css("left", offset + "px");
		$('.submit').removeClass("footer-lock");
	}
	else  if (totalLength > 36) {
		$('.submit').css("left", "0");
		$('.submit').addClass("footer-lock");
	}

	else {}
	 // console.log('companyLength:'+companyLength+', nameLength'+nameLength);
		if (messageLength > 49 && nameLength > 1 && companyLength > 2) {
			$('.submit').addClass("submit-ready")
		}
		else {
			$('.submit').removeClass("submit-ready");
		 };
};

function hideSubmit() {
	$('.submit').css("display", "none");
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
    	$("#RESULT_TextField-0").focus();
	});

// Wait until html has loaded
$(window).load(function(){

		// MODAL
		// Get the modal
	var modal = document.getElementById('myModal');

	// Get the buttons that open the modal
	var btn = document.getElementById("myBtn");
	var btn2 = document.getElementById("rainbow-btn");
	var btn3 = document.getElementById("email-btn");

	// Get the <span> element that closes the modal
	var span = document.getElementsByClassName("close")[0];

	// When the user clicks on the button, open the modal 
	btn.onclick = function() {
	    modal.style.display = "block";
	    $('html').css("overflow", "hidden");
	}
	btn2.onclick = function() {
	    modal.style.display = "block";
	    $('html').css("overflow", "hidden");
	}
	btn3.onclick = function() {
	    modal.style.display = "block";
	    $('html').css("overflow", "hidden");
	}

	// When the user clicks on <span> (x), close the modal
	span.onclick = function() {
	    modal.style.display = "none";
	    $('html').css("overflow", "auto");
	}

	// When the user clicks anywhere outside of the modal, close it
	window.onclick = function(event) {
	    if (event.target == modal) {
	        modal.style.display = "none";
	        $('html').css("overflow", "auto");
	    }
	}
}