// Scroll to top

$("a[href='#top']").click(function() {
  $("html, body").animate({ scrollTop: 0 }, "slow");
  return false;
});
window.onscroll = function () {
    if (pageYOffset >= 800) {
        document.getElementById('backToTop').style.visibility = "visible";
    } else {
 document.getElementById('backToTop').style.visibility = "hidden";
    }
};

// Logo mouseover flip
$(document).on({
   mouseover: function(event) {
         $('.navbar li').css("opacity", "1");
         $('.logo').css("transform", "rotateX(180deg)");
         $('.logo').css("opacity", "0");
         $('.hamburger-wrapper').css("transform", "scale(0,0)");
         $('.hamburger-wrapper').css("opacity", "0");

   },
   mouseleave: function(event) {
   	   $('.logo').css("transform", "rotateX(0deg)");
       $('.navbar li').css("opacity", "0");
       $('.logo').css("opacity", "1");
       $('.hamburger-wrapper').css("transform", "scale(1,1)");
       $('.hamburger-wrapper').css("opacity", "1");

   }
}, '.nav-wrapper')