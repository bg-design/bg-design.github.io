
function darkModeOn() {

    $("#darkModeOff").removeClass("show");

    var snackbar = document.getElementById("darkModeOn");
    snackbar.className = "show";
    setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 4000);
  }

  function darkModeOff() {

    $("#darkModeOn").removeClass("show");

    var snackbar = document.getElementById("darkModeOff");
    snackbar.className = "show";
    setTimeout(function(){ snackbar.className = snackbar.className.replace("show", ""); }, 4000);
  }

// Dark mode switch listener

document.addEventListener('DOMContentLoaded', function () {
  var checkbox = document.querySelector('input[type="checkbox"]');

  checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
      document.body.classList.add("dark-mode");
      sessionStorage.setItem('setDarkMode', 'true');
      darkModeOn ();
    } else {
      document.body.classList.remove("dark-mode");
      sessionStorage.setItem('setDarkMode', 'false');
      darkModeOff ();
    }
  });
});

var time = new Date();
var hour = time.getHours();
if ( sessionStorage.getItem('setDarkMode') === 'true') {
      document.body.classList.add("dark-mode");
      document.getElementById("checkbox").checked = true;
    }
else if ( sessionStorage.getItem('setDarkMode') === 'false') {
    document.body.classList.remove("dark-mode");
    document.getElementById("checkbox").checked = false;
}
else if ((hour <= 8) || (hour >= 17)) {
    document.body.classList.add("dark-mode");
    document.getElementById("checkbox").checked = true;
}
else {
  document.body.classList.remove("dark-mode");
  document.getElementById("checkbox").checked = false;
}

// var time = new Date();
// var hour = time.getHours();
// if ( sessionStorage.getItem('setDarkMode') === 'true') {
//       document.body.classList.add("dark-mode");
//       document.getElementById("checkbox").checked = true;
//     }
// else if ( sessionStorage.getItem('setDarkMode') === 'false') {
//     document.body.classList.remove("dark-mode");
//     document.getElementById("checkbox").checked = false;
// }
// else if ((hour <= 6) || (hour >= 18)) {
//     document.body.classList.add("dark-mode");
//     document.getElementById("checkbox").checked = true;
// }
// else {
//   document.body.classList.remove("dark-mode");
//   document.getElementById("checkbox").checked = false;
// }

// AM/PM Dark Mode
// function nightTime() {
// 	var time = new Date();
//     var hour = time.getHours();
//     // if ((hour <= 6) || (hour >= 18))
//     if (true)
//     {
//     	$( "p" ).addClass( "dark-mode" );
//     	$( "html" ).addClass( "dark-mode-bg-home" );
//     	$( ".home-link" ).addClass( "dark-mode" );
//     }
// ;
// }

// $( document ).ready(function() {
// 	nightTime();
// });


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