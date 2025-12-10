document.addEventListener("DOMContentLoaded", function () {
  // --- NEW: CHECK FOR REGISTRATION SUCCESS ---
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("status") === "registered") {
    // Small delay to ensure the page loads first
    setTimeout(() => {
      alert("✅ Registration Successful! Please sign in.");

      // Optional: Clean the URL so the alert doesn't show on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 500);
  }

  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      // 1. STOP THE BROWSER FROM RELOADING
      e.preventDefault();

      // 2. Get Values
      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;

      // 3. Send to Server
      fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // --- SUCCESS ---

            // A. Save User Info (So dashboard knows who is logged in)
            const userInfo = {
              username: data.username,
              role: data.role,
              firstname: data.firstname,
              lastname: data.lastname,
              email: data.email,
              phone: data.phone,
              houseUnit: data.houseUnit,
              street: data.street,
              barangay: data.barangay,
              city: data.city,
              zipcode: data.zipcode,
              profilePhoto: data.profilePhoto,
            };
            localStorage.setItem("currentUser", JSON.stringify(userInfo));

            alert("✅ Welcome back, " + data.firstname + "!");

            // B. Redirect based on Role
            // (Adjust these paths if your folders are named differently!)
            // login.js

            if (data.role === "teacher") {
              // Go UP one level (out of 'auth'), then DOWN into 'interfaces' -> 'teacher_interface' -> 'teacher_dashboard'
              window.location.href =
                "../interfaces/teacher_interface/teacher_dashboard/teacher_dashboard.html";
            } else if (data.role === "parent") {
              // Fixed Path: Added the /parent_dashboard/ folder
              window.location.href =
                "../interfaces/parent_interface/parent_dashboard/parent_dashboard.html";
            } else {
              window.location.href = "../index.html";
            }
          } else {
            // --- FAIL ---
            alert("❌ Login Failed: " + data.message);
          }
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("❌ Server Error. Make sure 'node server.js' is running!");
        });
    });
  }
});
