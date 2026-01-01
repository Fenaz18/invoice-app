import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import { Plus, FileText, Download, Trash2, CheckCircle, Mail, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, isPast, isToday, parseISO } from 'date-fns' // Added date helpers
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All') 
  const navigate = useNavigate()

  useEffect(() => {
    const fetchInvoices = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('invoices')
        .select(`*, clients (name, email, address), invoice_items (description, quantity, price, tax)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) console.error('Supabase Error:', error)
      else setInvoices(data || [])
      
      setLoading(false)
    }

    fetchInvoices()
  }, [])

  // ---(Handles Overdue) ---
  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'Paid') return 'Paid'
    
    // Check if Due Date is in the past (and not today)
    const dueDate = parseISO(invoice.due_date)
    if (isPast(dueDate) && !isToday(dueDate)) {
      return 'Overdue'
    }
    
    return invoice.status // Returns 'Draft' or 'Sent'
  }

  // --- ACTIONS ---

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (!error) setInvoices(invoices.filter(inv => inv.id !== id))
  }

  const handleMarkPaid = async (invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'Paid' })
      .eq('id', invoice.id)

    if (error) {
      alert("Error updating status")
    } else {
      setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv))
    }
  }

  const handleSendEmail = (invoice) => {
    const email = invoice.clients?.email || 'client'
    alert(`📧 SIMULATION: Sending invoice #${invoice.id.slice(0,5)} to ${email}...\n\n✅ Email Sent!`)
    
    if (invoice.status === 'Draft') {
      supabase.from('invoices').update({ status: 'Sent' }).eq('id', invoice.id).then(() => {
        setInvoices(invoices.map(inv => inv.id === invoice.id ? { ...inv, status: 'Sent' } : inv))
      })
    }
  }

  const handleDownloadPDF = (invoice) => {
    try {
      const doc = new jsPDF()
      
      // Vector Logo
      doc.setFillColor(37, 99, 235)
      doc.roundedRect(14, 10, 12, 12, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('IA', 16, 17.5)

      // Reset
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')

      // Header
      doc.setFontSize(20)
      doc.text('INVOICE', 14, 30)
      doc.setFontSize(10)
      doc.text(`Invoice #: ${invoice.id.slice(0, 8)}`, 14, 38)
      doc.text(`Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`, 14, 43)

      const clientName = invoice.clients?.name || 'Client'
      doc.text('Bill To:', 140, 30)
      doc.setFont('helvetica', 'bold')
      doc.text(clientName, 140, 35)
      doc.setFont('helvetica', 'normal')

      const items = invoice.invoice_items || []
      const tableRows = items.map(item => [
        item.description, item.quantity, `$${item.price}`, `${item.tax}%`, `$${((item.quantity * item.price) * (1 + item.tax/100)).toFixed(2)}`
      ])

      autoTable(doc, { startY: 55, head: [['Desc', 'Qty', 'Price', 'Tax', 'Total']], body: tableRows, theme: 'grid', headStyles: { fillColor: [37, 99, 235] } })
      
      const finalY = (doc.lastAutoTable?.finalY || 55) + 10
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Total: $${invoice.total_amount}`, 140, finalY)

      doc.save(`Invoice_${clientName}.pdf`)
    } catch(error) { 
      console.error("PDF Error:", error)
      alert("PDF Generation Failed") 
    }
  }

  // --- FILTER LOGIC ---
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'All') return true
    
    const realStatus = getInvoiceStatus(inv) // Calculate status (Draft, Sent, Paid, Overdue)
    return realStatus === statusFilter
  })

  // Helper for Badge Colors
  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return { bg: '#dcfce7', text: '#166534' } // Green
      case 'Overdue': return { bg: '#fee2e2', text: '#991b1b' } // Red
      case 'Sent': return { bg: '#dbeafe', text: '#1e40af' } // Blue
      default: return { bg: '#f1f5f9', text: '#475569' } // Gray (Draft)
    }
  }

  if (loading) return <div className="dashboard-layout"><Sidebar /><div className="main-content">Loading...</div></div>

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <div className="header">
          <h2>Invoices</h2>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
                {/* FILTER DROPDOWN */}
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '500' }}
                >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                </select>
            </div>

            <button className="btn" onClick={() => navigate('/invoices/new')}>
                <Plus size={18} /> New Invoice
            </button>
          </div>
        </div>

        <div className="card-grid" style={{ gridTemplateColumns: '1fr' }}>
          {filteredInvoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              <FileText size={48} style={{ opacity: 0.2 }} />
              <p>No invoices found.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b', fontSize: '0.9rem' }}>
                  <th style={{ padding: '12px' }}>Client</th>
                  <th style={{ padding: '12px' }}>Due Date</th>
                  <th style={{ padding: '12px' }}>Amount</th>
                  <th style={{ padding: '12px' }}>Status</th>
                  <th style={{ padding: '12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map(inv => {
                  const realStatus = getInvoiceStatus(inv)
                  const colors = getStatusColor(realStatus)

                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '15px', fontWeight: '500' }}>{inv.clients?.name}</td>
                      
                      {/* Show Due Date instead of Created Date for better context */}
                      <td style={{ color: realStatus === 'Overdue' ? '#dc2626' : 'inherit', fontWeight: realStatus === 'Overdue' ? '600' : '400' }}>
                        {format(parseISO(inv.due_date), 'dd MMM yyyy')}
                      </td>
                      
                      <td style={{ fontWeight: 'bold' }}>${inv.total_amount}</td>
                      <td>
                        {/* Status Badge */}
                        <span style={{
                          padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                          background: colors.bg, color: colors.text,
                          display: 'inline-flex', alignItems: 'center', gap: '4px'
                        }}>
                          {realStatus === 'Overdue' && <AlertCircle size={12}/>}
                          {realStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleSendEmail(inv)} title="Send Email" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#3b82f6' }}><Mail size={18} /></button>
                          
                          {realStatus !== 'Paid' && (
                              <button onClick={() => handleMarkPaid(inv)} title="Mark Paid" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#16a34a' }}><CheckCircle size={18} /></button>
                          )}

                          <button onClick={() => handleDownloadPDF(inv)} title="Download" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><Download size={18} /></button>
                          <button onClick={() => handleDelete(inv.id)} title="Delete" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}