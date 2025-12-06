// 1. Select the elements
const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");

// 2. Function to OPEN the menu
openBtn.addEventListener("click", () => {
  navBar.classList.add("active");
  overlay.classList.add("active");
});

// 3. Function to CLOSE the menu (When clicking the overlay)
overlay.addEventListener("click", () => {
  navBar.classList.remove("active");
  overlay.classList.remove("active");
});
