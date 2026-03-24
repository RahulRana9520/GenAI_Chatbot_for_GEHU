const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
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

// Teacher signup endpoint
router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, department, employee_id, password } = req.body

    // Validate input
    if (!full_name || !email || !department || !employee_id || !password) {
      return res.status(400).json({ message: "All fields are required" })
    }

    // Check if email already exists
    const connection = await pool.getConnection()
    const [existingTeachers] = await connection.execute("SELECT * FROM teachers WHERE email = ?", [email])

    if (existingTeachers.length > 0) {
      connection.release()
      return res.status(400).json({ message: "Email already registered" })
    }

    // Hash the password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Insert new teacher
    const [result] = await connection.execute(
      "INSERT INTO teachers (full_name, email, department, employee_id, password) VALUES (?, ?, ?, ?, ?)",
      [full_name, email, department, employee_id, hashedPassword],
    )

    connection.release()

    res.status(201).json({
      message: "Teacher registered successfully",
      teacherId: result.insertId,
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ message: "Server error during signup" })
  }
})

module.exports = router
