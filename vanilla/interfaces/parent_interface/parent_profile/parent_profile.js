document.addEventListener("DOMContentLoaded", function () {
    
    // --- 1. Save Profile Button Visual Logic ---
    const saveBtn = document.getElementById("saveProfileBtn");
    if(saveBtn) {
        saveBtn.addEventListener("click", function() {
            const originalText = saveBtn.innerText;
            saveBtn.innerHTML = 'Saved <span class="material-symbols-outlined" style="font-size: 18px;">check</span>';
            saveBtn.style.background = "#2ecc71"; 
            
            setTimeout(() => {
                saveBtn.innerText = originalText;
                saveBtn.style.background = ""; 
            }, 2000);
        });
    }

    // --- 2. Modal Logic for Editing Student ---
    const modalOverlay = document.getElementById("studentModal");
    const editButtons = document.querySelectorAll(".edit-child-btn");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelModalBtn = document.getElementById("cancelModalBtn");
    const saveModalBtn = document.getElementById("saveModalBtn");

    function openModal() {
        modalOverlay.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent background scroll
    }

    function closeModal() {
        modalOverlay.classList.remove("active");
        document.body.style.overflow = ""; // Restore scroll
    }

    // Attach click event to all "Edit" pencils
    editButtons.forEach(btn => {
        btn.addEventListener("click", openModal);
    });

    // Close buttons
    if(closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
    if(cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

    // Save Modal Button (Visual Feedback)
    if(saveModalBtn) {
        saveModalBtn.addEventListener("click", function() {
            // Simulate saving...
            saveModalBtn.innerText = "Saving...";
            
            setTimeout(() => {
                saveModalBtn.innerText = "Save Details";
                closeModal();
                alert("Student details updated successfully.");
            }, 800);
        });
    }

    // Close if clicking outside the modal card
    if(modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if(e.target === modalOverlay) closeModal();
        });
    }
});