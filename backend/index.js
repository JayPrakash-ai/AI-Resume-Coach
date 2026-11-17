const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(cors());
app.use(express.json());

// User Registration API
app.post("/register", async (req, res) => 
{ 
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Name, email, and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long."
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: "This email is already registered."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, credits`,
      [name.trim(), normalizedEmail, hashedPassword]
    );

    res.status(201).json({
      message: "Registration successful!",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Resgistration error:", error.message);

    res.status(500).json({
      error: "Registration failed. Please try again."
    });
  }
});

app.get("/", (req, res) => {
  res.json({
    message: "AI Resume Coach Backend is runnig!"
  });
});

// Get logged-in user using JWT
app.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication token required."
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: "Invalid or expired token."
      });
    }

    const result = await pool.query(
      "SELECT id, name, email, credits FROM users WHERE id = $1",
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found."
      });
    }

    return res.status(200).json({
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      error: "Unable to fetch user details."
    });
  }
});

//Analyze Resume API and save results to PostgreSQL
app.post("/analyze", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: "Please log in first."
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    console.error("JWT verification error:", error.name, error.message);
    
    return res.status(401).json({
      error: "Invalid or expired token."
    });
  }

  const client = await pool.connect();

  try {
    const { resume, jobDescription } = req.body;

    if (!resume || !jobDescription) {
      return res.status(400).json({
        error: "Resume and job description are required."
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      "SELECT id, credits FROM users WHERE id = $1 FOR UPDATE",
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "User not found."
      });
    }

    const credits = userResult.rows[0].credits;

    if (credits <= 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "No credits remaining. Please upgrade your plan."
      });
    }

    const skills = [
      "java",
      "javascript",
      "html",
      "css",
      "react",
      "python",
      "sql",
      "git",
      "github",
      "node.js"
    ];

    const resumeText = resume.toLowerCase();
    const jobText = jobDescription.toLowerCase();

    const matchingSkills = skills.filter(
      (skill) =>
        resumeText.includes(skill) && jobText.includes(skill)
    );

    const missingSkills = skills.filter(
      (skill) =>
        !resumeText.includes(skill) && jobText.includes(skill)
    );

    const totalSkills = matchingSkills.length + missingSkills.length;

    const matchPercentage =
      totalSkills === 0
        ? 0
        : Math.round((matchingSkills.length / totalSkills) * 100);

    const suggestion =
      "Focus on learning the missing skills mentioned in the job description.";

    const analysisResult = await client.query(
      `INSERT INTO resume_analyses
       (user_id, resume, job_description, matching_skills,
        missing_skills, suggestion, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        decoded.id,
        resume,
        jobDescription,
        matchingSkills.join(", "),
        missingSkills.join(", "),
        suggestion,
        matchPercentage
      ]
    );

    const creditResult = await client.query(
      "UPDATE users SET credits = credits - 1 WHERE id = $1 RETURNING credits",
      [decoded.id]
    );

    await client.query("COMMIT");

    res.json({
      id: analysisResult.rows[0].id,
      matchingSkills,
      missingSkills,
      matchPercentage,
      suggestion,
      credits: creditResult.rows[0].credits
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Resume analysis error:", error.message);

    res.status(500).json({
      error: "Failed to analyze and save the resume."
    });
  } finally {
    client.release();
  }
});

const PORT = 5000;

// User Login API
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      "SELECT id, name, email, password_hash, credits FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }  
    ); 

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      error: "Login failed. Please try again."
    });
  }
});

app.get("/analyses", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication token required."
    });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT id, score, matching_skills, missing_skills, suggestion
       FROM resume_analyses
       WHERE user_id = $1
       ORDER BY id DESC`,
      [decoded.id]
    );

    return res.json({ analyses: result.rows });
  } catch (error) {
    console.error("Fetch analyses error:", error.message);

    return res.status(500).json({
      error: "Unable to fetch resume analyses."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});