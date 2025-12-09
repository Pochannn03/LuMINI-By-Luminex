const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// Function to Toggle Menu (Identical to Teacher Dashboard)
openBtn.addEventListener("click", () => {
  // Check if we are on Desktop or Mobile
  const isDesktop = window.innerWidth >= 1024;

  if (isDesktop) {
    // DESKTOP: Toggle the "expanded" class for width change
    navBar.classList.toggle("expanded");
    body.classList.toggle("sidebar-open"); 
  } else {
    // MOBILE: Toggle the "active" class for slide-in
    navBar.classList.toggle("active");
    overlay.classList.toggle("active");
  }
});

// Close menu when clicking overlay (Mobile only)
overlay.addEventListener("click", () => {
  navBar.classList.remove("active");
  overlay.classList.remove("active");
});