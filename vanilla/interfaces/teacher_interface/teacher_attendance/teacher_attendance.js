let currentDate = (document.getElementById("dateDisplay").innerText =
  new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }));

let chosenDate = document.getElementById("chosenDate");
chosenDate.innerText = currentDate;
