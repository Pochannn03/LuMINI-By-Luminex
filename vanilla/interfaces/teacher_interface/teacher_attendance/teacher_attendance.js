document.addEventListener("DOMContentLoaded", function () {
  const dateDisplay = document.getElementById("dateDisplay");
  const today = new Date();
  if(dateDisplay) dateDisplay.innerText = today.toLocaleDateString("en-US", { weekday: 'short', month: 'long', day: 'numeric' });

  // Handle click for status toggles
  const toggles = document.querySelectorAll('.segment-opt');
  
  toggles.forEach(btn => {
    btn.addEventListener('click', function() {
      // Visual Update
      const group = this.parentElement;
      group.querySelectorAll('.segment-opt').forEach(sib => sib.classList.remove('active'));
      this.classList.add('active');
      
      // Check input
      this.querySelector('input').checked = true;

      updateStats();
    });
  });

  updateStats();

  document.getElementById("saveBtn").addEventListener("click", collectAttendanceData);
});

function updateStats() {
  const totalPresent = document.querySelectorAll('.segment-opt.present input:checked').length;
  const totalAbsent = document.querySelectorAll('.segment-opt.absent input:checked').length;
  
  document.getElementById("countPresent").innerText = totalPresent;
  document.getElementById("countAbsent").innerText = totalAbsent;
}

function collectAttendanceData() {
  const attendancePayload = [];
  const date = new Date().toISOString().split('T')[0];

  document.querySelectorAll('.table-row').forEach(row => {
    const studentId = row.getAttribute('data-student-id');
    const statusInput = row.querySelector('input:checked');
    
    attendancePayload.push({
      student_id: studentId,
      date: date,
      status: statusInput ? statusInput.value : null,
      timestamp: new Date().toISOString()
    });
  });

  console.log(JSON.stringify(attendancePayload, null, 2));
  alert("Data Ready! Check Console.");
}