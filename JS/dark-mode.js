// AM/PM Dark Mode
function nightTime() {
  var time = new Date();
    var hour = time.getHours();
    if ((hour <= 6) || (hour >= 18))
    {
      $( "p,h1,h2,h3,h4,h5,p a" ).addClass( "dark-mode" );
      $( "html" ).addClass( "dark-mode-bg-home" );
      $( ".home-link" ).addClass( "dark-mode" );
    }
;
}
nightTime();