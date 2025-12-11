const openBtn = document.getElementById("burgerIconOpenNav");
const navBar = document.getElementById("sideNavBar");
const overlay = document.getElementById("navOverlay");
const body = document.body;

// 1. Sidebar Logic
openBtn.addEventListener("click", () => {
  const isDesktop = window.innerWidth >= 1024;
  if (isDesktop) {
    navBar.classList.toggle("expanded");
    body.classList.toggle("sidebar-open"); 
  } else {
    navBar.classList.toggle("active");
    overlay.classList.toggle("active");
  }
});

overlay.addEventListener("click", () => {
  navBar.classList.remove("active");
  overlay.classList.remove("active");
});

// --- MODAL LOGIC ---

// A. Edit Class Modal
const editModal = document.getElementById("editClassModal");
const openEditBtns = document.querySelectorAll(".open-edit-modal");
const closeEditBtns = document.querySelectorAll(".close-edit-modal");

openEditBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        editModal.classList.add("active");
    });
});

closeEditBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        editModal.classList.remove("active");
    });
});


// B. Add New Class Modal
const addModal = document.getElementById("addClassModal");
const addBtn = document.getElementById("addClassBtn");
const closeAddBtn = document.getElementById("closeAddModalBtn");

if(addBtn) {
    addBtn.addEventListener("click", () => {
        addModal.classList.add("active");
    });
}

if(closeAddBtn) {
    closeAddBtn.addEventListener("click", () => {
        addModal.classList.remove("active");
    });
}

// C. Close Modals when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === editModal) {
        editModal.classList.remove("active");
    }
    if (e.target === addModal) {
        addModal.classList.remove("active");
    }
});