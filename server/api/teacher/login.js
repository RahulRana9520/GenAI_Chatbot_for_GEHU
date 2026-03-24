const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const mysql = require("mysql2/promise")

// Create a connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "#RAHULRANA12345",
  database: "teacher_notes",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

// JWT secret key
const JWT_SECRET = "your_jwt_secret_key" // In production, use environment variable

// Teacher login endpoint
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    // Get teacher from database
    const connection = await pool.getConnection()
    const [teachers] = await connection.execute("SELECT * FROM teachers WHERE email = ?", [email])
    connection.release()

    if (teachers.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const teacher = teachers[0]

    // Compare passwords
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

    // Remove password from response
    const { password: _, ...teacherWithoutPassword } = teacher

    res.status(200).json({
      message: "Login successful",
      token,
      teacher: teacherWithoutPassword,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

module.exports = router
