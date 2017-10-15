// Time of Day Greeting

datetoday = new Date();
timenow=datetoday.getTime();
datetoday.setTime(timenow);
thehour = datetoday.getHours();
if (thehour > 21 || thehour < 4) display = "Burning the midnight oil?";
else if (thehour >16) display = "Good evening.";
else if (thehour >11) display = "Good afternoon.";
else if (thehour >7) display = "Morning.";
else display = "Top of the mornin'!";
var greeting = (display);

document.getElementById("greeting").innerHTML = greeting;