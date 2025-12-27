import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rss } from "@phosphor-icons/react";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    
    const success = await login(password);
    if (success) {
      navigate("/");
    } else {
      setError("Incorrect password");
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <h1>
          <a href="/" className="title-link">
            things to be happy about
          </a>
        </h1>
        <div className="header-actions">
          <a
            href="/feed"
            target="_blank"
            rel="noopener noreferrer"
            className="rss-link"
            title="Subscribe to RSS feed"
          >
            <Rss size={24} weight="regular" />
          </a>
        </div>
      </header>
      <div className="login-content">
        <div className="login-card">
          <h1>Admin Login</h1>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="login-input"
              autoFocus
            />
            {error && <div className="login-error">{error}</div>}
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
