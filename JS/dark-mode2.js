
  alert('What the actual fuck?');


// AM/PM Dark Mode
function nightTime() {
	var time = new Date();
    var hour = time.getHours();
    // if ((hour <= 6) || (hour >= 18))
    if (true)
    {
    	$( "p" ).addClass( "dark-mode" );
    	$( "html" ).addClass( "dark-mode-bg-home" );
    	$( ".home-link" ).addClass( "dark-mode" );
    }
;
}

$( document ).ready(function() {
	nightTime();
});

alert("Is this thing on?");

//// DARK MODE SWITCH
// Highlight Buttons
// var $highlight = $('.highlight');

// function translate(obj) {
  
//     var $this    = obj.addClass('active'),
//         width    = $this.width(),
//         margin   = $this.outerWidth(true) - $this.outerWidth(),
//         position = $this.offset().left + margin/2;

//     $highlight.css({
//         width: parseInt(width) + 'px',
//         transform: 'translate(' + parseInt(position) + 'px' + ')'
//     });
// }

// // add transition after page load
// $(window).on('load resize', function() {
    
//     // wait a little bit to add transition so we don't see on page load
//     setTimeout(function() {
//         $highlight.css({
//             transition: 'all .5s'
//         });
//     }, 100);

//     // load highlight on active control
//   translate($('li:first-child'));
// });

// // switch to active control on click
// $('li:not(.highlight)').on('click', function() {
  
//   $('li').removeClass('active');
//   translate($(this));
// });