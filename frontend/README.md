AI Resume Coach

A full-stack web application that helps users compare their resumes with job descriptions and identify matching and missing skills.

Features

- User registration and login
- JWT-based authentication
- Resume and job description analysis
- Matching and missing skill detection
- Resume match percentage
- Credit-based analysis usage
- Saved analysis history
- PostgreSQL database integration

Tech Stack

Frontend: React, Vite, JavaScript, CSS
Backend: Node.js, Express.js
Database: PostgreSQL
Authentication: JSON Web Tokens (JWT)

How It Works

1. Register or log in to your account.
2. Enter your resume text.
3. Enter the job description.
4. View matching skills, missing skills, and the match percentage.
5. Review your saved analyses in the dashboard.

Run Locally

Prerequisites

- Node.js and npm
- PostgreSQL

Backend

Open a terminal:

cd backend
npm install
node index.js

Configure the required environment variables in "backend/.env". Do not commit secrets or passwords to GitHub.

Frontend

Open a second terminal:

cd frontend
npm install
npm.cmd run dev

Open the local URL displayed by Vite in your browser.

Current Scope

The current analyzer uses keyword-based skill matching. An external AI API integration is not yet included.

Future Improvements

- AI-powered resume feedback
- Improved analysis history with timestamps
- Subscription and payment integration
- Deployment and automated testing