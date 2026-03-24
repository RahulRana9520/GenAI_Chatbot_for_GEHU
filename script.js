document.addEventListener("DOMContentLoaded", () => {
    const prompt = document.querySelector("#prompt")
    const submitbtn = document.querySelector("#submit")
    const chatContainer = document.querySelector(".chat_container")
    const imagebtn = document.querySelector("#image")
    const image = document.querySelector("#image img")
    const imageinput = document.querySelector("#image input")
    const aiChatBox = document.querySelector(".ai-chat-box")
    const sideNav = document.getElementById("side-nav")
    const menuIcon = document.getElementById("menu-icon")
    const menuContent = document.getElementById("menu-content")
    const commands = document.querySelectorAll(".command")
    const loginStatusBar = document.getElementById("login-status-bar")
    const menuSignin = document.getElementById("menu-signin")
    const menuStudentDash = document.getElementById("menu-student-dash")
    const menuLogout = document.getElementById("menu-logout")
  
    // API Base URL (backend)
    const API_BASE = "http://localhost:3000"
    // Note: previous code called Gemini directly from the frontend using a hardcoded key.
    // We now call the backend proxy endpoint POST /api/ai which forwards requests to the configured AI provider.

    // ---- Session helpers ----
    // A user is "logged in as student" if studentToken exists
    // A user is "logged in as teacher" if teacherToken exists
    function getStudentToken()  { return localStorage.getItem("studentToken") }
    function getStudentName()   { return localStorage.getItem("studentName") }
    function getTeacherToken()  { return localStorage.getItem("teacherToken") }
    function getTeacherName()   { return localStorage.getItem("teacherName") }
    function isLoggedIn()       { return !!(getStudentToken() || getTeacherToken()) }

    // ---- Update UI based on login state ----
    function refreshLoginUI() {
      const studentName = getStudentName()
      const teacherName = getTeacherName()

      if (studentName || teacherName) {
        const name = studentName || teacherName
        const role = teacherName ? "Teacher" : "Student"
        const roleColor = teacherName ? "#c084fc" : "#4fc3f7"
        loginStatusBar.innerHTML = `
          <span style="color:${roleColor}; font-weight:600;">${role}</span>
          <span style="color:#fff;"> · ${name}</span>
        `
        menuSignin.style.display = "none"
        menuStudentDash.style.display = "block"
        menuStudentDash.href = teacherName
          ? "dashboard/teacher-dashboard.html"
          : "dashboard/student-dashboard.html"
        menuStudentDash.textContent = teacherName ? "🏫 Teacher Dashboard" : "🎓 My Dashboard"
        menuLogout.style.display = "block"
      } else {
        loginStatusBar.innerHTML = `<span style="color:#aaa;">Not logged in · </span><a href="signUpPage/index.html" style="color:#4fc3f7;" target="_blank">Sign in</a>`
        menuSignin.style.display = "block"
        menuStudentDash.style.display = "none"
        menuLogout.style.display = "none"
      }
    }

    // Logout from menu
    menuLogout.addEventListener("click", (e) => {
      e.preventDefault()
      ;["studentToken","studentName","studentDept","teacherToken","teacherName","teacher_token"].forEach(k => localStorage.removeItem(k))
      refreshLoginUI()
      menuContent.classList.remove("active")
    })

    refreshLoginUI()
    
    const user = {
      message: null,
      file: {
        mime_type: null,
        data: null,
      },
    }
  
    // Function to toggle side navigation
    function toggleSideNav() {
      sideNav.classList.toggle("hidden")
      aiChatBox.classList.toggle("full-width")
    }
  
    // Hide side nav when clicking on prompt
    prompt.addEventListener("focus", () => {
      if (!sideNav.classList.contains("hidden")) {
        toggleSideNav()
      }
    })
  
    // Toggle menu content
    menuIcon.addEventListener("click", () => {
      menuContent.classList.toggle("active")
    })
  
    // Close menu when clicking outside
    document.addEventListener("click", (event) => {
      if (!menuIcon.contains(event.target) && !menuContent.contains(event.target)) {
        menuContent.classList.remove("active")
      }
    })
  
    // Quick commands
    commands.forEach((command) => {
      command.addEventListener("click", () => {
        const commandText = command.getAttribute("data-command")
        // "fetch notes" command triggers the login-gate immediately
        if (command.id === "cmd-fetch-notes") {
          if (!isLoggedIn()) {
            showLoginPromptInChat()
            return
          }
          const name = getStudentName() || getTeacherName() || ""
          prompt.value = `Fetch ${name} notes`
        } else {
          prompt.value = commandText
        }
        handlechatResponse(prompt.value)
      })
    })

    // ---- Show login prompt bubble ----
    function showLoginPromptInChat() {
      const html = `<img src="img/teacher1.png" alt="" id="AiImage">
        <div class="teacher-chat-area">
          <p>🔒 <strong>Login required</strong> to fetch teacher notes.</p>
          <p style="margin-top:8px;">
            <a href="signUpPage/student-login.html" target="_blank" style="color:#4fc3f7; font-weight:600;">Student Login</a>
            &nbsp;·&nbsp;
            <a href="signUpPage/student-signup.html" target="_blank" style="color:#4fc3f7;">Create Account</a>
          </p>
          <p style="margin-top:6px; font-size:13px; opacity:0.7;">Once logged in, come back and try again!</p>
        </div>`
      const box = createChatBox(html, "teacher-chat-box")
      document.querySelector(".ai-response").appendChild(box)
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" })
    }

    // ---- Main response handler ----
    async function generateResponse(aiChatBox) {
      const text = aiChatBox.querySelector(".teacher-chat-area")
  
      const fetchNotesRegex = /fetch\s+([a-zA-Z\s]+?)(?:\s+(?:sir|mam|ma'am))?\s+notes(?:\s+with\s+keyword\s+(.+))?/i
      const match = user.message.match(fetchNotesRegex)
  
      if (match) {
        // ---- GATE: must be logged in as student or teacher ----
        if (!isLoggedIn()) {
          text.innerHTML = `
            <p>🔒 <strong>Login required</strong> to fetch teacher notes.</p>
            <p style="margin-top:8px;">
              <a href="signUpPage/student-login.html" target="_blank" style="color:#4fc3f7; font-weight:600;">Student Login</a>
              &nbsp;·&nbsp;
              <a href="signUpPage/student-signup.html" target="_blank" style="color:#4fc3f7;">Create Account</a>
            </p>
            <p style="margin-top:6px; font-size:13px; opacity:0.7;">Once logged in, come back and search notes!</p>
          `
          return
        }

        const teacherName = match[1].trim()
        const keyword = match[2] ? match[2].trim() : ""
  
        try {
          let fetchUrl = `${API_BASE}/fetch-notes?teacher_name=${encodeURIComponent(teacherName)}`
          if (keyword) {
            fetchUrl += `&keyword=${encodeURIComponent(keyword)}`
          }
          const response = await fetch(fetchUrl)
          if (!response.ok) throw new Error(`Server returned ${response.status}`)
          const data = await response.json()
  
          if (data.length > 0) {
            const pdfLinks = data
              .map((note) => {
                const fileName = note.keyword || note.file_url.split("/").pop()
                return `<a href="${note.file_url}" target="_blank" class="pdf-link">${fileName}</a>`
              })
              .join("<br>")
            text.innerHTML = `
              <p>✅ Found <strong>${data.length}</strong> note(s) from <strong>${teacherName}</strong>${keyword ? ` · keyword: "<em>${keyword}</em>"` : ""}:</p>
              <div class="notes-list" style="margin-top:8px;">${pdfLinks}</div>
            `
          } else {
            text.innerHTML = `
              <p>❌ No notes found from <strong>${teacherName}</strong>${keyword ? ` with keyword "<em>${keyword}</em>"` : ""}.</p>
              <p style="font-size:13px; opacity:0.8; margin-top:6px;">Try just the first or last name, or a different keyword.</p>
            `
          }
        } catch (error) {
          text.innerHTML = `<p>⚠️ Error fetching notes: ${error.message}</p>`
        }
      } else {
        // General AI response via backend proxy
        try {
          const body = { prompt: user.message, model: 'arcee-ai/trinity-large-preview:free' }
          // If an image file was attached, include minimal metadata (the backend can be extended to accept base64 inline data)
          if (user.file && user.file.data) {
            body.file = { mime_type: user.file.mime_type, data: user.file.data }
          }

          const response = await fetch(`${API_BASE}/api/ai`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })

          const data = await response.json()

          // Handle common response shapes (OpenAI / Chat completions, older responses, or passthrough errors)
          let rawResponse = ""
          if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error))
          }

          // OpenAI Chat Completions: data.choices[0].message.content
          if (data.choices && data.choices[0]) {
            rawResponse = data.choices[0].message?.content || data.choices[0].text || ""
            if (Array.isArray(rawResponse)) rawResponse = rawResponse.join(" ")
          } else if (data.candidates && data.candidates[0]) {
            // Gemini-like shape
            rawResponse = data.candidates[0].content?.parts?.[0]?.text || ""
          } else if (typeof data === "string") {
            rawResponse = data
          } else {
            rawResponse = JSON.stringify(data)
          }

          rawResponse = (rawResponse || "").toString().replace(/\*\*(.*?)\*\*/g, "$1").trim()

          const sentences = rawResponse.split(/(?<=[.?!])\s+/)
          let formattedResponse = sentences
            .map((sentence) => {
              if (sentence.startsWith("-") || sentence.match(/^\d+\./)) {
                return `<li>${sentence}</li>`
              } else {
                return `<p>${sentence}</p>`
              }
            })
            .join("")
          if (formattedResponse.includes("<li>")) {
            formattedResponse = `<ul>${formattedResponse}</ul>`
          }
          text.innerHTML = formattedResponse || "<p>(no text returned)</p>"
        } catch (error) {
          console.error('AI request error:', error)
          // Show a clearer, sanitized error in the chat so the user sees provider details
          const safeMessage = (error && error.message) ? String(error.message) : 'Unknown error'
          text.innerHTML = `<p>Sorry, I encountered an error processing your request.</p><p style="font-size:12px;opacity:0.8;margin-top:6px;">Error: ${safeMessage}</p>`
        } finally {
          chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" })
          image.src = `img/img.svg`
          image.classList.remove("choose")
          user.file = {}
        }
      }
    }
  
    function createChatBox(html, classes) {
      const div = document.createElement("div")
      div.innerHTML = html
      div.classList.add(classes)
      return div
    }
  
    function handlechatResponse(userMessage) {
      user.message = userMessage
      const html = `<img src="img/user.png" alt="" id="userImage">
        <div class="user-chat-area">
        ${user.message}
        ${user.file.data ? `<img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg"/>` : ""}  
        </div>`
  
      prompt.value = "" // clear the prompt
      const userChatBox = createChatBox(html, "user-chat-box")
      document.querySelector(".ai-response").appendChild(userChatBox)
  
      chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" })
  
      // Hide the side nav when chat starts on mobile
      if (window.innerWidth <= 768 && !sideNav.classList.contains("hidden")) {
        toggleSideNav()
      }
  
      setTimeout(() => {
        const html = `<img src="img/teacher1.png" alt="" id="AiImage">
                <div class="teacher-chat-area">
                <img src="img/loading.gif" alt="loading" width="50px">
                </div>`
        const aiChatBox = createChatBox(html, "teacher-chat-box")
        document.querySelector(".ai-response").appendChild(aiChatBox)
        generateResponse(aiChatBox)
      }, 600)
    }
  
    // Chat input event listeners
    prompt.addEventListener("keydown", (e) => {
      if (e.key == "Enter") {
        handlechatResponse(prompt.value)
      }
    })
  
    submitbtn.addEventListener("click", () => {
      handlechatResponse(prompt.value)
    })
  
    // Image upload handling
    imageinput.addEventListener("change", () => {
      const file = imageinput.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64string = e.target.result.split(",")[1]
        user.file = {
          mime_type: file.type,
          data: base64string,
        }
        image.src = `data:${user.file.mime_type};base64,${user.file.data}`
        image.classList.add("choose")
      }
      reader.readAsDataURL(file)
    })
  
    imagebtn.addEventListener("click", () => {
      imagebtn.querySelector("input").click()
    })
  })
  