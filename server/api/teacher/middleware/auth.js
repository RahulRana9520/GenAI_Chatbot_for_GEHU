const jwt = require("jsonwebtoken")

// JWT secret key
const JWT_SECRET = "your_jwt_secret_key" // In production, use environment variable

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

module.exports = { authenticateTeacher }
