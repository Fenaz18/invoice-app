import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import { Plus, Search, User, X, Save, Pencil } from 'lucide-react'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // New State for Editing
  const [editingClient, setEditingClient] = useState(null)
  
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' })

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error fetching clients:', error)
    else setClients(data || [])
  }

  // Handle "Edit" Click
  const handleEditClick = (client) => {
    setEditingClient(client)
    setFormData({ 
      name: client.name, 
      email: client.email, 
      phone: client.phone, 
      address: client.address 
    })
    setShowForm(true)
  }

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    
    try {
      if (editingClient) {
        // --- UPDATE EXISTING CLIENT ---
        const { error } = await supabase
          .from('clients')
          .update(formData)
          .eq('id', editingClient.id)

        if (error) throw error
        alert('Client Updated Successfully')

      } else {
        // --- CREATE NEW CLIENT ---
        const { error } = await supabase
          .from('clients')
          .insert([{ ...formData, user_id: user.id }])

        if (error) throw error
        alert('Client Added Successfully')
      }

      // Refresh and Close
      await fetchClients()
      setShowForm(false)
      setFormData({ name: '', email: '', phone: '', address: '' }) 
      setEditingClient(null)

    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle Cancel
  const handleCancel = () => {
    setShowForm(false)
    setEditingClient(null)
    setFormData({ name: '', email: '', phone: '', address: '' })
  }

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="dashboard-layout">
      <Sidebar />
      
      <div className="main-content">
        <div className="header">
          <h2>Clients</h2>
          <button 
            className="btn" 
            onClick={() => {
              if (showForm) handleCancel()
              else setShowForm(true)
            }}
            style={{ 
              backgroundColor: showForm ? '#ef4444' : '#2563eb',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            {showForm ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add Client</>}
          </button>
        </div>

        {/* --- FORM SECTION --- */}
        {showForm ? (
          <div className="form-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <form onSubmit={handleSubmit}>
              
              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input 
                  required
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Acme Corp"
                />
              </div>

              <div className="grid-2" style={{ gap: '1.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input 
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="client@email.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input 
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+1 234 567 890"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <input 
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Business St, City, Country"
                />
              </div>

              <div className="form-actions">
                <button className="btn" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} /> {loading ? 'Saving...' : (editingClient ? 'Update Client' : 'Save Client')}
                </button>
                <button 
                    type="button" 
                    className="btn" 
                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}
                    onClick={handleCancel}
                >
                    Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
        /* --- LIST SECTION --- */
          <>
            <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '12px', alignItems: 'center', border: '1px solid #e2e8f0' }}>
                <Search color="#94a3b8" size={20} />
                <input 
                    type="text" 
                    placeholder="Search clients..." 
                    style={{ border: 'none', outline: 'none', fontSize: '0.95rem', width: '100%', background: 'transparent' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
              {filteredClients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <p>No clients found.</p>
                </div>
              ) : (
                filteredClients.map(client => (
                  <div key={client.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '50%', border: '1px solid #dbeafe' }}>
                        <User size={20} color="#2563eb" />
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#0f172a' }}>{client.name}</h4>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{client.email}</p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#64748b', marginRight: '1rem' }}>
                        <div style={{ marginBottom: '4px' }}>{client.phone}</div>
                        <div>{client.address}</div>
                      </div>

                      {/* EDIT BUTTON */}
                      <button 
                        onClick={() => handleEditClick(client)}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                        title="Edit Client"
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}