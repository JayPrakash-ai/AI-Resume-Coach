import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [resume, setResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showRegister, setShowRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMessage("");

    const endpoint = showRegister ? "/register" : "/login";

    const body = showRegister
      ? { name, email, password }
      : { email, password };

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      if (!response.ok) {
        setAuthMessage(data.error || "Authentication failed.");
        return;
      }

      setAuthMessage(data.message || "Success!");

      if (data.user) {
        setCurrentUser(data.user);
        fetchUserDetails();
        setIsLoggedIn(true);
        setName(data.user.name || "");
        setPassword("");
      }
    } catch (error) {
      setAuthMessage("Cannot connect to the backend.");
    }
  };
  
  const fetchUserDetails = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      return;
    }

    const response = await fetch("http://localhost:5000/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.user) {
      localStorage.removeItem("authToken");
      setIsLoggedIn(false);
      setCurrentUser(null);
      return;
    }

    setCurrentUser(data.user);
    setName(data.user.name || "");
    setIsLoggedIn(true);
  } catch (error) {
    console.error("Unable to load user details:", error);
  }
};

const fetchAnalyses = async () => {
  try {
    const token = localStorage.getItem("authToken");

    if (!token) return;

    const response = await fetch("http://localhost:5000/analyses", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Unable to load analyses:", data.error);
      return;
    }

    setAnalyses(
      data.analyses.map((item) => ({
        id: item.id,
        matchPercentage: item.score,
        date: "Saved analysis",
      }))
    );
  } catch (error) {
    console.error("Unable to load analyses:", error);
  }
};

useEffect(() => {
  fetchUserDetails();
  fetchAnalyses();
}, []);

  const analyzeResume = async () => {
    if (!resume || !jobDescription) {
      setResult({
        error: "Please enter your resume and job description.",
      });
      return;
    }

    // Skills to check
    const skills = [
      "Java",
      "HTML",
      "CSS",
      "JavaScript",
      "Python",
      "React",
      "SQL",
      "Git",
      "Github",
    ];

    const resumeText = resume.toLowerCase();
    const jobText = jobDescription.toLowerCase();

    const matchingSkills = skills.filter(
      (skill) =>
        resumeText.includes(skill.toLowerCase()) &&
        jobText.includes(skill.toLowerCase())
    );

    const missingSkills = skills.filter(
      (skill) =>
        !resumeText.includes(skill.toLowerCase()) &&
        jobText.includes(skill.toLowerCase())
    );

    const totalRequired = matchingSkills.length + missingSkills.length;

    const matchPercentage =
      totalRequired === 0
        ? 0
        : Math.round((matchingSkills.length / totalRequired) * 100);

    try {
      const response = await fetch("http://localhost:5000/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          resume: resume,
          jobDescription: jobDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          error: data.error || "Something went wrong.",
        });
        return;
      }

      const newAnalysis = {
        id: Date.now(),
        matchPercentage: matchPercentage,
        date: new Date().toLocaleDateString(),
      };

      setAnalyses((previous) => [newAnalysis, ...previous]);

      setResult({
        matchingSkills,
        missingSkills,
        matchPercentage,
        error: "",
      });
    } catch (error) {
      setResult({
        error: "Cannot connect to the backend.",
      });
    }
  };

  return (
    <>
    {!isLoggedIn && (
      <div className="auth-container">
        <form className="auth-card" onSubmit={handleAuth}>
          <h1>AI Resume Coach</h1>
          <h2>{showRegister ? "Create Account" : "Welcome Back"}</h2>

          {showRegister && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            {showRegister ? "Register" : "Login"}
          </button>

          {authMessage && <p>{authMessage}</p>}

          <p>
            {showRegister ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => {
                setShowRegister(!showRegister);
                setAuthMessage("");
              }}
            >
              {showRegister ? "Login" : "Create account"}
            </button>
          </p>
        </form>
      </div>
    )}

    {isLoggedIn && (
    <div className="app">
      {/* Header */}

      <header className="navbar">
        <h1>AI Resume Coach</h1>
        <span>{currentUser?.name || "User"}</span>
        <span className="plan">Free Plan</span>
        <button
          onClick={() => {
            localStorage.removeItem("authToken");
            setIsLoggedIn(false);
            setCurrentUser(null);
            setPassword("");
            setAuthMessage("");
          }}
        >
          Logout
        </button>
      </header>

      {/* Dashboard */}

      <main className="container">
        <section className="dashboard">
          <h1>Dashboard</h1>

          <p>
            Analyze your resume against a job description and improve your
            chances of getting noticed.
          </p>

          <div className="dashboard-cards">
            <div className="dashboard-card">
              <h3>Current Plan</h3>
              <h2>Free</h2>
              <p>Basic Resume Analysis</p>
            </div>

            <div className="dashboard-card">
              <h3>Credits</h3>
              <h2>{currentUser?.credits ?? 0} / 5</h2>
              <p>Analyses available</p>
            </div>

            <div className="dashboard-card">
              <h3>Analyses</h3>
              <h2>{analyses.length}</h2>
              <p>Total analyses</p>
            </div>
          </div>
        </section>

        {/* Resume Analyzer */}

        <section className="card">
          <h2>Analyze Resume</h2>

          <h3>Your Resume</h3>

          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="Paste your resume here..."
          />

          <h3>Job Description</h3>

          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
          />

          <button onClick={analyzeResume}>Analyze Resume</button>
        </section>

        {/* Analysis Result */}

        {result && !result.error && (
          <section className="card result">
            <h2>Analysis Result</h2>

            <div className="score">
              <h1>{result.matchPercentage}%</h1>
              <p>Job Match</p>
            </div>

            <h3>Matching Skills</h3>

            {result.matchingSkills?.length > 0 ? (
              <ul>
                {result.matchingSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p>No matching skills found.</p>
            )}

            <h3>Missing Skills</h3>

            {result.missingSkills?.length > 0 ? (
              <ul>
                {result.missingSkills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p>No missing skills found.</p>
            )}

            <h3>Suggestion</h3>

            <p>
              Focus on learning the missing skills mentioned in the job
              description and consider adding relevant projects to your
              resume.
            </p>
          </section>
        )}

        {/* Error */}

        {result && result.error && (
          <section className="card error">
            <p>{result.error}</p>
          </section>
        )}

        {/* Recent Analyses */}

        <section className="card">
          <h2>Recent Analyses</h2>

          {analyses.length === 0 ? (
            <p>No analyses yet. Analyze your first resume above.</p>
          ) : (
            analyses.map((analysis) => (
              <div className="history" key={analysis.id}>
                <div>
                  <strong>Resume Analysis</strong>

                  <p>{analysis.date}</p>
                </div>

                <strong>{analysis.matchPercentage}%</strong>
              </div>
            ))
          )}
        </section>

        {/* Upgrade */}

        <section className="upgrade">
          <h2>Want more?</h2>

          <p>
            Upgrade to Pro for advanced AI analysis, more credits and
            additional career tools.
          </p>

          <button>Upgrade to Pro</button>
        </section>
      </main>
    </div>
    )}
   </>
  );
}

export default App;