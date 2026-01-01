import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients' 
import CreateInvoice from './pages/CreateInvoice'
import Invoices from './pages/Invoices'

function PrivateRoute({ children }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/')
      else setUser(user)
      setLoading(false)
    })
  }, [navigate])

  if (loading) return <div>Loading...</div>
  return user ? children : null
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        
        
        <Route path="/clients" element={
          <PrivateRoute><Clients /></PrivateRoute>
        } />

        <Route path="/invoices" element={
          <PrivateRoute><Invoices /></PrivateRoute>
        } />

        <Route path="/invoices/new" element={
          <PrivateRoute><CreateInvoice /></PrivateRoute>
        } />

      </Routes>
    </BrowserRouter>
  )
}

export default App