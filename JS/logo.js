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

// Mouseover nav flip
// $(document).on({
//    mouseover: function(event) {
//         $('.logo').css("transform", "rotateX(180deg)");
//         $('.logo').css("opacity", "0");
//         $('.ham-menu').css("transform", "scale(0,0)");
//         $('.ham-menu').css("opacity", "0");
//         $('.navbar li').css("display", "inline");
//             $('.logo').css("display", "none");
//             $('.ham-menu').css("display", "none");

//    },
//    mouseleave: function(event) {
//    	   $('.navbar li').css("display", "none");
//        $('.logo').css("display", "inline");
//        $('.logo').css("opacity", "1");
//        $('.ham-menu').css("display", "inline");
//        $('.ham-menu').css("opacity", "1");

//        setTimeout(function() {
//           $('.logo').css("transform", "rotateX(0deg)");
//           $('.logo').css("opacity", "1");
//           $('.ham-menu').css("transform", "scale(1,1)");
//           $('.ham-menu').css("opacity", "1");
//        },000);

//    }
// }, '.nav-wrapper')

// Click on hamburger
function showNav() {
  $('.logo').css("transform", "rotateX(180deg)");
  $('.logo').css("opacity", "0");
  $('.ham-menu').css("transform", "scale(0,0)");
  $('.ham-menu').css("opacity", "0");
  $('.navbar li').css("display", "inline");
  $('.hamburger').css("border", "none");

  setTimeout(function() {
    $('.logo').css("display", "none");
    $('.ham-menu').css("display", "none");
  },1000);

}

// Disable loading screen when ready
$(document).ready( function () {
  setTimeout(function() {
    $('.loading-bg').css("opacity", "0");
        setTimeout(function() {
        $('.loading-bg').css("display", "none");
      },1100);
  },1100);
  
    })