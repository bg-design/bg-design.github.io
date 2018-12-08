
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

// // Current year for copyright (future-proof)
// document.getElementById("current-year").innerHTML = (new Date().getFullYear());

// Dark mode switch listener

document.addEventListener('DOMContentLoaded', function () {
  var checkbox = document.querySelector('input[type="checkbox"]');

  checkbox.addEventListener('change', function () {
    if (checkbox.checked) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  });
});