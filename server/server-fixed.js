const express = require("express")
const bodyParser = require("body-parser")
const multer = require("multer")
const mysql = require("mysql2")
const cors = require("cors")
const path = require("path")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const fs = require("fs")

// Load environment variables from .env if present (optional)
try {
  require('dotenv').config()
} catch (e) {
  // dotenv not installed; continue — environment variables may be provided by the OS
}

const app = express()
const PORT = process.env.PORT || 3000

// JWT secret key (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../teacher_notes_project/uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
  console.log("Created uploads directory:", uploadsDir)
}

// Enable CORS with specific options
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Parse JSON request bodies
app.use(bodyParser.json())

// Serve static files
app.use("/teacher_notes_project/uploads", express.static(path.join(__dirname, "../teacher_notes_project/uploads")))
// Also serve the original uploads directory for backward compatibility
app.use("/uploads", express.static("uploads"))
app.use(express.static("public"))

// Database connection
const connection = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "#RAHULRANA12345",
  database: process.env.DB_NAME || "teacher_notes",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
})

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err.stack)
    return
  }
  console.log("Connected to the database as ID:", connection.threadId)

  // Create teachers table if it doesn't exist
  const createTeachersTable = `
    CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      department VARCHAR(100) NOT NULL,
      employee_id VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  connection.query(createTeachersTable, (err) => {
    if (err) console.error("Error creating teachers table:", err)
    else console.log("Teachers table ready")
  })

  // Create students table
  const createStudentsTable = `
    CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      enrollment_id VARCHAR(50) NOT NULL UNIQUE,
      department VARCHAR(100) NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
  connection.query(createStudentsTable, (err) => {
    if (err) console.error("Error creating students table:", err)
    else console.log("Students table ready")
  })

  // Create teacher_notes table if it doesn't exist
  const createNotesTable = `
    CREATE TABLE IF NOT EXISTS teacher_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      teacher_name VARCHAR(100) NOT NULL,
      file_url VARCHAR(255) NOT NULL,
      keyword VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

  connection.query(createNotesTable, (err, results) => {
    if (err) {
      console.error("Error creating teacher_notes table:", err)
    } else {
      console.log("Teacher_notes table ready")
    }
  })
})

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../teacher_notes_project/uploads"))
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  },
})

const upload = multer({ storage: storage })

// Authentication middleware
const authenticateTeacher = (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const token = authHeader.split(" ")[1]

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)

    // Add teacher info to request
    req.teacher = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" })
  }
}

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`)
  next()
})

// Teacher signup endpoint
app.post("/api/teacher/signup", async (req, res) => {
  try {
    console.log("Signup request received:", req.body)
    const { full_name, email, department, employee_id, password } = req.body

    // Validate input
    if (!full_name || !email || !department || !employee_id || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if email already exists
    connection.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, results) => {
      if (err) {
        console.error("Database error:", err)
        return res.status(500).json({ message: "Server error" })
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "Email already registered" })
      }

      // Hash the password
      try {
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        // Insert new teacher
        connection.query(
          "INSERT INTO teachers (full_name, email, department, employee_id, password) VALUES (?, ?, ?, ?, ?)",
          [full_name, email, department, employee_id, hashedPassword],
          (err, results) => {
            if (err) {
              console.error("Database error:", err)
              return res.status(500).json({ message: "Server error" })
            }

            res.status(201).json({
              message: "Teacher registered successfully",
              teacherId: results.insertId,
            })
          },
        )
      } catch (hashError) {
        console.error("Password hashing error:", hashError)
        return res.status(500).json({ message: "Error creating account" })
      }
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Server error during signup" })
  }
})

// Teacher login endpoint
app.post("/api/teacher/login", (req, res) => {
  console.log("Login request received:", req.body)
  const { email, password } = req.body

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  // Get teacher from database
  connection.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Database error:", err)
      return res.status(500).json({ message: "Server error" })
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const teacher = results[0]

    // Compare passwords
    try {
      const passwordMatch = await bcrypt.compare(password, teacher.password)
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" })
      }

      // Create JWT token
      const token = jwt.sign(
        {
          id: teacher.id,
          email: teacher.email,
          name: teacher.full_name,
        },
        JWT_SECRET,
        { expiresIn: "24h" },
      )

      // Remove password from response - FIX: Use a different variable name
      const teacherWithoutPassword = { ...teacher }
      delete teacherWithoutPassword.password

      res.status(200).json({
        message: "Login successful",
        token,
        teacher: teacherWithoutPassword,
      })
    } catch (error) {
      console.error("Password comparison error:", error)
      res.status(500).json({ message: "Server error during login" })
    }
  })
})

// Protected route - Upload note (only for authenticated teachers)
app.post("/upload-note", authenticateTeacher, upload.single("note"), (req, res) => {
  const teacherName = req.teacher.name // Get teacher name from token
  const keyword = req.body.keyword || null
  const file = req.file

  if (!file) {
    return res.status(400).send("No file uploaded")
  }

  // Generate the file URL with the new path
  const fileUrl = `http://localhost:3000/teacher_notes_project/uploads/${file.filename}`

  // Save to database
  const query = "INSERT INTO teacher_notes (teacher_name, file_url, keyword) VALUES (?, ?, ?)"
  connection.query(query, [teacherName, fileUrl, keyword], (err, results) => {
    if (err) {
      console.error("Database error when saving note:", err)
      return res.status(500).send("Error saving note to database")
    }
    res.send("Note uploaded successfully")
  })
})

// Create an API endpoint for fetching notes
app.get("/fetch-notes", (req, res) => {
  const { teacher_name, keyword } = req.query

  console.log("Fetch notes request:", { teacher_name, keyword })

  // Check if teacher_name is provided
  if (!teacher_name) {
    return res.status(400).json({ message: "Teacher name is required" })
  }

  // Convert teacher_name to lowercase for case-insensitive comparison
  const teacherNameLower = teacher_name.toLowerCase()

  // Query all notes first
  connection.query("SELECT * FROM teacher_notes", (err, allResults) => {
    if (err) {
      console.error("Database query error:", err)
      return res.status(500).send("Error fetching notes from database")
    }

    console.log("All notes in database:", allResults)

    // Filter results manually for more flexible matching
    let results = allResults.filter((note) => {
      const noteTeacherName = note.teacher_name.toLowerCase()
      return noteTeacherName.includes(teacherNameLower) || teacherNameLower.includes(noteTeacherName)
    })

    // Further filter by keyword if provided
    if (keyword && keyword.trim() !== "") {
      const keywordLower = keyword.toLowerCase()
      results = results.filter((note) => {
        if (!note.keyword) return false
        return note.keyword.toLowerCase().includes(keywordLower)
      })
    }

    console.log("Filtered results:", results)
    res.json(results)
  })
})

// Root route
app.get("/", (req, res) => {
    res.json({
      message: "GEnius Chatbot API Server",
      status: "Running",
      endpoints: {
        teacher_signup: "POST /api/teacher/signup",
        teacher_login: "POST /api/teacher/login",
        upload_note: "POST /api/upload",
        fetch_notes: "GET /fetch-notes?teacher_name=...",
        ai_proxy: "POST /api/ai  (forwards to OpenAI; set OPENAI_API_KEY env or include apiKey in body for quick tests)",
        verify_token: "GET /api/verify-token",
        notices: "GET/POST /api/notices",
      },
    })
})

const gehuSystemPrompt = require('./gehuSystemPrompt');
// AI proxy endpoint - forwards requests to OpenRouter Gemini API
app.post('/api/ai', async (req, res) => {
  try {
    // Use OpenRouter key from env or body
    const openrouterKey = process.env.OPENAI_API_KEY || req.body.apiKey
    let { prompt, model } = req.body
    if (!openrouterKey) {
      return res.status(400).json({ error: 'No OpenRouter API key provided. Set OPENAI_API_KEY in .env or include apiKey in the POST body.' })
    }

    // OpenRouter Gemini model (default)
    // Use the correct OpenRouter model ID for Google: Gemma 2B (free)
    const usedModel = model || 'arcee-ai/trinity-large-preview:free'

    // No forced language system message
    // System prompt for teacher-like, polite, and location-aware chatbot
    const payload = {
      model: usedModel,
      messages: [
        { role: 'system', content: gehuSystemPrompt },
        { role: 'user', content: prompt || '' }
      ]
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'GEnius-Chatbot'
      },
      body: JSON.stringify(payload),
    })
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      data = { raw: text }
    }
    if (!response.ok) {
      console.error('OpenRouter error:', data)
    }
    return res.status(response.status || 200).json(data)
  } catch (err) {
    console.error('AI proxy error:', err)
    res.status(502).json({ error: 'AI proxy error', details: err.message })
  }
})

// Verify token endpoint (for client-side authentication check)
app.get("/api/verify-token", authenticateTeacher, (req, res) => {
  res.status(200).json({
    valid: true,
    teacher: {
      id: req.teacher.id,
      name: req.teacher.name,
      email: req.teacher.email,
    },
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err)
  res.status(500).json({ message: "Internal server error" })
})

// ===================== STUDENT ROUTES =====================

// Student Signup
app.post("/api/student/signup", async (req, res) => {
  try {
    const { full_name, email, enrollment_id, department, password } = req.body
    if (!full_name || !email || !enrollment_id || !department || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }
    connection.query("SELECT id FROM students WHERE email = ? OR enrollment_id = ?", [email, enrollment_id], async (err, results) => {
      if (err) return res.status(500).json({ message: "Server error" })
      if (results.length > 0) return res.status(400).json({ message: "Email or Enrollment ID already registered" })
      const hashedPassword = await bcrypt.hash(password, 10)
      connection.query(
        "INSERT INTO students (full_name, email, enrollment_id, department, password) VALUES (?, ?, ?, ?, ?)",
        [full_name, email, enrollment_id, department, hashedPassword],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Server error" })
          res.status(201).json({ message: "Student registered successfully", studentId: result.insertId })
        }
      )
    })
  } catch (e) {
    res.status(500).json({ message: "Server error" })
  }
})

// Student Login
app.post("/api/student/login", (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" })
  connection.query("SELECT * FROM students WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Server error" })
    if (results.length === 0) return res.status(401).json({ message: "Invalid email or password" })
    const student = results[0]
    const match = await bcrypt.compare(password, student.password)
    if (!match) return res.status(401).json({ message: "Invalid email or password" })
    const token = jwt.sign(
      { id: student.id, email: student.email, name: student.full_name, role: "student" },
      JWT_SECRET, { expiresIn: "24h" }
    )
    const { password: _, ...studentData } = student
    res.status(200).json({ message: "Login successful", token, student: studentData })
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
