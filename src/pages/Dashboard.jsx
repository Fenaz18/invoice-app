import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { Plus, Users, FileText, DollarSign } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({ clients: 0, invoices: 0, pending: 0 })

  useEffect(() => {
    const getData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/')
        return
      }
      setUser(user)

      // 1. Get Client Count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      // 2. Get Invoice Count & Calculate Total Pending
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select('total_amount') // We only need the amount to calculate totals
        .eq('user_id', user.id)

      // Calculate the sum of all invoices
      const totalPending = invoiceData?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0
      const invoiceCount = invoiceData?.length || 0

      // Update State
      setStats({ 
        clients: clientCount || 0, 
        invoices: invoiceCount, 
        pending: totalPending.toFixed(2) // Format as currency string
      })
    }
    getData()
  }, [navigate])

  if (!user) return <div>Loading...</div>

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <div className="header">
          <div>
            <h1 style={{ margin: 0 }}>Dashboard</h1>
            <p style={{ color: '#64748b', marginTop: '5px' }}>Welcome back, {user.email}</p>
          </div>
          <button className="btn" onClick={() => navigate('/invoices/new')}>
            <Plus size={18} /> New Invoice
          </button>
        </div>

        {/* --- STAT CARDS --- */}
        <div className="card-grid">
          
          {/* Card 1: Clients */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '50%' }}>
              <Users size={24} color="#2563eb" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Clients</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.clients}</div>
            </div>
          </div>

          {/* Card 2: Invoices Sent */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '50%' }}>
              <FileText size={24} color="#16a34a" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Invoices Created</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>{stats.invoices}</div>
            </div>
          </div>

          {/* Card 3: Total Revenue/Pending */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#fff7ed', padding: '12px', borderRadius: '50%' }}>
              <DollarSign size={24} color="#ea580c" />
            </div>
            <div>
              <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Total Value</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a' }}>
                ${stats.pending}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}