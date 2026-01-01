import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { FileText, Lock, Mail } from 'lucide-react' // Added Icons

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) navigate('/dashboard')
    }
    checkUser()
  }, [navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign Up
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert("Account created! You are logged in.")
        navigate('/dashboard')
      } else {
        // Log In
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/dashboard')
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="auth-card">
        
        {/* Header Section */}
        <div className="auth-header">
          <div className="auth-icon">
            <FileText size={32} strokeWidth={2.5} />
          </div>
          <h1 className="auth-title">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="auth-subtitle">
            {isSignUp 
              ? "Start managing your invoices in seconds." 
              : "Sign in to access your dashboard."}
          </p>
        </div>
        
        {/* Form Section */}
        <form onSubmit={handleAuth}>
          <div style={{ position: 'relative' }}>
            <input 
              className="auth-input"
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              className="auth-input"
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
            />
          </div>

          <button className="auth-btn" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        {/* Footer / Toggle */}
        <p className="auth-toggle">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <span 
            className="auth-link"
            onClick={() => setIsSignUp(!isSignUp)}
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </span>
        </p>

      </div>
    </div>
  )
}