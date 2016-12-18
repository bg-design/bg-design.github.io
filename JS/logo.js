// Scroll to top

$("a[href='#top']").click(function() {
  $("html, body").animate({ scrollTop: 0 }, "slow");
  return false;
});
// window.onscroll = function () {
//     if (pageYOffset >= 800) {
//         document.getElementById('backToTop').style.visibility = "visible";
//     } else {
//  document.getElementById('backToTop').style.visibility = "hidden";
//     }
// };

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
$(window).on("load", function() {
  setTimeout(function() {
    $('.loading-bg').css("opacity", "0");
        setTimeout(function() {
        $('.loading-bg').css("display", "none");
      },1100);
  },1100);
  
    })

// Hide Header on on scroll down
var didScroll;
var lastScrollTop = 0;
var delta = 5;
var navbarHeight = $('.navbar').outerHeight();

$(window).scroll(function(event){
    didScroll = true;
});

setInterval(function() {
    if (didScroll) {
        hasScrolled();
        didScroll = false;
    }
}, 250);

function hasScrolled() {
    var st = $(this).scrollTop();
    
    // Make sure they scroll more than delta
    if(Math.abs(lastScrollTop - st) <= delta)
        return;
    
    // If they scrolled down and are past the navbar, add class .nav-up.
    // This is necessary so you never see what is "behind" the navbar.
    if (st > lastScrollTop && st > navbarHeight){
        // Scroll Down
        $('.navbar').removeClass('nav-down').addClass('nav-up');
        document.getElementById('backToTop').style.visibility = "hidden";
            
    } else {
        // Scroll Up
        if(st + $(window).height() < $(document).height()) {
            $('.navbar').removeClass('nav-up').addClass('nav-down');
            if (pageYOffset >= 800) {
                document.getElementById('backToTop').style.visibility = "visible";
            } else {
         document.getElementById('backToTop').style.visibility = "hidden";
            }
        }
    }
    
    lastScrollTop = st;
}

// Google Analytics
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

  ga('create', 'UA-88633939-1', 'auto');
  ga('send', 'pageview');
