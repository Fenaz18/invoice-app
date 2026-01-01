import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, FileText, LogOut } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <div className="sidebar">
      <div className="brand">
        <FileText size={24} /> InvoiceApp
      </div>
      
      <nav>
        <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
          <LayoutDashboard size={20} /> Dashboard
        </Link>
        <Link to="/clients" className={`nav-item ${isActive('/clients')}`}>
          <Users size={20} /> Clients
        </Link>
        <Link to="/invoices" className={`nav-item ${isActive('/invoices')}`}>
          <FileText size={20} /> Invoices
        </Link>
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <button onClick={handleLogout} className="nav-item">
          <LogOut size={20} /> Sign Out
        </button>
      </div>
    </div>
  )
}