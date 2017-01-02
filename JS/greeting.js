// Time of Day Greeting

// Original:  Robert Ison
// Web Site:  http://www.infosourcetraining.com

datetoday = new Date();
timenow=datetoday.getTime();
datetoday.setTime(timenow);
thehour = datetoday.getHours();
if (thehour > 17) display = "evening";
else if (thehour >12) display = "afternoon";
else display = "morning";
var greeting = ("Good " + display);

document.getElementById("greeting").innerHTML = greeting;