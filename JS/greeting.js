// Time of Day Greeting

// Original:  Robert Ison
// Web Site:  http://www.infosourcetraining.com

datetoday = new Date();
timenow=datetoday.getTime();
datetoday.setTime(timenow);
thehour = datetoday.getHours();
if (thehour > 21 || thehour < 4) display = "Burning the midnight oil?";
else if (thehour >17) display = "Good evening.";
else if (thehour >12) display = "Good afternoon.";
else if (thehour >7) display = "Morning.";
else display = "Top of the mornin'!";
var greeting = (display);

// document.getElementById("greeting-title").innerHTML = greeting;
document.getElementById("greeting").innerHTML = greeting;