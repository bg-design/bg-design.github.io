// Hide Header on on scroll down
var didScroll;
var lastScrollTop = 0;
var delta = 5;
var navbarHeight = $('.navbar').outerHeight();

$(window).scroll(function(event){
    didScroll = true;
},);

function hasScrolled() {
    var st = $(this).scrollTop();
    
    // Make sure they scroll more than delta
    if(Math.abs(lastScrollTop - st) <= delta)
        return;
    
    // If they scrolled down and are past the navbar, add class .nav-up.
    // This is necessary so you never see what is "behind" the navbar.
    if (st > lastScrollTop && st > navbarHeight){
        // Scroll Down
        setTimeout(function() {
            $('.navbar').removeClass('nav-down').addClass('nav-up');
            $('#contextualNav').removeClass('nav-up').addClass('nav-down');
        },);
            
    } else {
        // Scroll Up
        if(st + $(window).height() < $(document).height()) {

            if ((pageYOffset <= 120) && ($('#contextualNav').length > 0)) {
                $('#contextualNav').removeClass('nav-down').addClass('nav-up');
                $('#mainNav').removeClass('nav-up').addClass('nav-down');
            }
            else if ($('#contextualNav').length > 0) {
                $('#mainNav').removeClass('nav-down').addClass('nav-up');
                $('#contextualNav').removeClass('nav-up').addClass('nav-down');
            } else {
                $('.navbar').addClass('nav-down').removeClass('nav-up');
            }
        }
    }
    
    lastScrollTop = st;
}

setInterval(function() {
    if (didScroll) {
        hasScrolled();
        didScroll = false;
    }
}, 250);