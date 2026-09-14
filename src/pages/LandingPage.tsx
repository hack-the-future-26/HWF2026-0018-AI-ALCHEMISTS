import { GithubLogo } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { supabase } from "../lib/supabase";

export function LandingPage() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "error" | "check-email">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signUp" && !/\.edu(\.|$)|\.ac\.in$/i.test(normalizedEmail)) {
      setStatus("error");
      setError("Please use a college email ending in .edu or .ac.in.");
      return;
    }

    setStatus("pending");
    setError("");

    if (mode === "signIn") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });
      if (signInError) {
        setStatus("error");
        setError(signInError.message);
      }
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    if (signUpError) {
      setStatus("error");
      setError(signUpError.message);
      return;
    }

    // Supabase returns a "successful" response with no error and no new
    // identities when the email is already registered (it never sends a
    // confirmation email in this case) — this is deliberate anti-enumeration
    // behavior, not a real signup. Without this check the form looked like it
    // created an account when it actually just silently matched an existing
    // one, which reads like a disguised login check.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setStatus("error");
      setError("An account with this email already exists. Please log in instead.");
      setMode("signIn");
      return;
    }

    if (!data.session) {
      setEmail(normalizedEmail);
      setStatus("check-email");
      return;
    }
  }

  async function handleGithubSignIn() {
    if (!supabase) return;
    setStatus("pending");
    setError("");
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin,
        scopes: "read:user"
      }
    });
    if (oauthError) {
      setStatus("error");
      setError(oauthError.message);
    }
  }

  return (
    <div className="landing-shell">
      <div className="landing-card card">
        <div className="brand">
          <span className="brand-mark">PS</span>
          <div>
            <strong>PeerSpace</strong>
            <span className="network-pill">Campus network</span>
          </div>
        </div>
        <h1>{mode === "signIn" ? "Welcome back" : "Create your account"}</h1>
        <p>
          {mode === "signIn"
            ? "Sign in with your verified college email to reconnect with your peer network."
            : "Use your college email (.edu or .ac.in) so classmates know it's really you."}
        </p>
        {status === "check-email" ? (
          <p className="profile-meta">
            We sent a confirmation link to {email}. Confirm it, then come back and log in.
          </p>
        ) : (
          <form className="create-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>College email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="jude@university.edu"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
            {mode === "signUp" && (
              <label className="field">
                <span>Full name</span>
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
            )}
            {status === "error" && <p className="form-error">{error}</p>}
            <button className="btn btn-primary" type="submit" disabled={status === "pending"}>
              {status === "pending"
                ? "Please wait..."
                : mode === "signIn"
                  ? "Log in to PeerSpace"
                  : "Create account"}
            </button>
          </form>
        )}
        {status !== "check-email" && (
          <>
            <div className="auth-divider">
              <span>or</span>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={status === "pending"}
              onClick={handleGithubSignIn}
            >
              <GithubLogo size={18} weight="fill" />
              Continue with GitHub
            </button>
          </>
        )}
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setMode((prev) => (prev === "signIn" ? "signUp" : "signIn"));
            setStatus("idle");
            setError("");
          }}
        >
          {mode === "signIn" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
