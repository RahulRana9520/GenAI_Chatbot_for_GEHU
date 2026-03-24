document.addEventListener("DOMContentLoaded", () => {
    const authMessage = document.getElementById("auth-message")
    const uploadForm = document.getElementById("upload-form")
    const uploadedNotes = document.getElementById("uploaded-notes")
    const teacherNameElement = document.getElementById("teacher-name")
    const notesList = document.getElementById("notes-list")
    const logoutBtn = document.getElementById("logout-btn")
    const noteUploadForm = document.getElementById("noteUploadForm")
    const fileInput = document.getElementById("note")
    const fileInputName = document.querySelector(".file-input-name")
  
    // Check if user is authenticated
    const token = localStorage.getItem("teacherToken")
    const teacherName = localStorage.getItem("teacherName")
  
    if (token) {
      // User is logged in
      authMessage.style.display = "none"
      uploadForm.style.display = "block"
      uploadedNotes.style.display = "block"
  
      if (teacherName) {
        teacherNameElement.textContent = teacherName
      }
  
      // Verify token validity
      verifyToken(token)
  
      // Load teacher's notes
      loadTeacherNotes(teacherName)
    } else {
      // User is not logged in
      authMessage.style.display = "block"
      uploadForm.style.display = "none"
      uploadedNotes.style.display = "none"
    }
  
    // File input change handler
    fileInput.addEventListener("change", function () {
      if (this.files.length > 0) {
        fileInputName.textContent = this.files[0].name
      } else {
        fileInputName.textContent = "No file chosen"
      }
    })
  
    // Form submission handler
    noteUploadForm.addEventListener("submit", function (e) {
      e.preventDefault()
  
      if (!token) {
        alert("You must be logged in to upload notes")
        return
      }
  
      const formData = new FormData(this)
  
      // Show loading state
      const uploadButton = document.getElementById("upload-button")
      const originalButtonText = uploadButton.textContent
      uploadButton.textContent = "Uploading..."
      uploadButton.disabled = true
  
      fetch("http://localhost:3000/upload-note", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Upload failed")
          }
          return response.text()
        })
        .then((data) => {
          alert("Note uploaded successfully!")
          noteUploadForm.reset()
          fileInputName.textContent = "No file chosen"
  
          // Reload the notes list
          loadTeacherNotes(teacherName)
        })
        .catch((error) => {
          console.error("Error:", error)
          alert("Failed to upload note. Please try again.")
        })
        .finally(() => {
          // Reset button state
          uploadButton.textContent = originalButtonText
          uploadButton.disabled = false
        })
    })
  
    // Logout handler
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("teacherToken")
      localStorage.removeItem("teacherName")
      window.location.href = "../signUpPage/teacher-login.html"
    })
  
    // Function to verify token
    function verifyToken(token) {
      fetch("http://localhost:3000/api/verify-token", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Invalid token")
          }
          return response.json()
        })
        .catch((error) => {
          console.error("Token verification failed:", error)
          // Token is invalid, log the user out
          localStorage.removeItem("teacherToken")
          localStorage.removeItem("teacherName")
          window.location.reload()
        })
    }
  
    // Function to load teacher's notes
    function loadTeacherNotes(teacherName) {
      if (!teacherName) return
  
      notesList.innerHTML = '<p class="loading">Loading your notes...</p>'
  
      fetch(`http://localhost:3000/fetch-notes?teacher_name=${encodeURIComponent(teacherName)}`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Failed to fetch notes")
          }
          return response.json()
        })
        .then((notes) => {
          if (notes.length === 0) {
            notesList.innerHTML = "<p>You haven't uploaded any notes yet.</p>"
            return
          }
  
          notesList.innerHTML = ""
          notes.forEach((note) => {
            const noteCard = document.createElement("div")
            noteCard.className = "note-card"
  
            const keyword = note.keyword || "Untitled"
            const date = new Date(note.created_at || Date.now()).toLocaleDateString()
  
            noteCard.innerHTML = `
                          <h3>${keyword}</h3>
                          <p>Uploaded: ${date}</p>
                          <a href="${note.file_url}" target="_blank">View PDF</a>
                      `
  
            notesList.appendChild(noteCard)
          })
        })
        .catch((error) => {
          console.error("Error fetching notes:", error)
          notesList.innerHTML = "<p>Failed to load notes. Please try again later.</p>"
        })
    }
  })
  