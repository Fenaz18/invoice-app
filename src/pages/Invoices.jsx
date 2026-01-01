import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import { Plus, FileText, Download, Trash2, CheckCircle, Mail, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format, isPast, isToday, parseISO } from 'date-fns' 
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

    if (!error) {
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

  // --- ADVANCED PDF GENERATOR (MATCHES CREATE PAGE) ---
  const handleDownloadPDF = (invoice) => {
    try {
      const doc = new jsPDF()
      
      // 1. EXTRACT DESIGN SETTINGS
      // If "design" column is empty (old invoices), use defaults.
      const design = invoice.design || { 
        template: 'modern', 
        themeColor: '#2563eb', 
        font: 'helvetica', 
        logo: null 
      }
      
      const { template, themeColor, font, logo } = design
      const selectedClient = invoice.clients || {}
      const items = invoice.invoice_items || []

      // Helper for Color
      const hexToRgb = (hex) => {
        const bigint = parseInt(hex.replace('#', ''), 16)
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
      }
      const rgb = hexToRgb(themeColor)

      // Common Settings
      doc.setFont(font)

      // --- TEMPLATE LOGIC ---
      if (template === 'modern') {
        // === LAYOUT 1: MODERN ===
        if (logo) {
          doc.addImage(logo, 'JPEG', 14, 10, 20, 20)
        } else {
          doc.setFillColor(themeColor)
          doc.roundedRect(14, 10, 15, 15, 2, 2, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(10)
          doc.text('IA', 17, 19) 
        }

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(22)
        doc.text('INVOICE', 196, 20, { align: 'right' })

        doc.setFontSize(10)
        doc.text(`Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`, 196, 30, { align: 'right' })
        doc.text(`Due Date: ${format(parseISO(invoice.due_date), 'dd MMM yyyy')}`, 196, 35, { align: 'right' })

        doc.text('Bill To:', 14, 40)
        doc.setFont(font, 'bold')
        doc.text(selectedClient.name || 'Client Name', 14, 45)
        doc.setFont(font, 'normal')
        doc.text(selectedClient.email || '', 14, 50)

        autoTable(doc, {
          startY: 60,
          head: [['Description', 'Qty', 'Price', 'Tax', 'Total']],
          body: items.map(item => [
              item.description, item.quantity, `$${item.price}`, `${item.tax}%`, 
              `$${((item.quantity * Number(item.price||0)) * (1 + Number(item.tax||0)/100)).toFixed(2)}`
          ]),
          theme: 'grid',
          headStyles: { fillColor: rgb },
          styles: { font: font }
        })

      } else if (template === 'minimal') {
        // === LAYOUT 2: MINIMAL ===
        doc.setDrawColor(200, 200, 200)
        doc.line(14, 25, 196, 25)

        if (logo) {
          doc.addImage(logo, 'JPEG', 14, 10, 10, 10)
          doc.setFontSize(14)
          doc.text("INVOICE", 30, 18)
        } else {
          doc.setFontSize(18)
          doc.text("INVOICE", 14, 18)
        }

        doc.setFontSize(10)
        doc.text(`Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`, 14, 35)
        doc.text(`Client: ${selectedClient.name || 'N/A'}`, 80, 35)
        doc.text(`Due: ${format(parseISO(invoice.due_date), 'dd MMM yyyy')}`, 150, 35)

        autoTable(doc, {
          startY: 45,
          head: [['DESCRIPTION', 'QTY', 'PRICE', 'TAX', 'TOTAL']],
          body: items.map(item => [
              item.description, item.quantity, `$${item.price}`, `${item.tax}%`, 
              `$${((item.quantity * Number(item.price||0)) * (1 + Number(item.tax||0)/100)).toFixed(2)}`
          ]),
          theme: 'plain',
          headStyles: { borderBottomWidth: 1.5, borderColor: [100,100,100] },
          styles: { font: font, fontSize: 10, cellPadding: 3 }
        })

      } else if (template === 'classic') {
        // === LAYOUT 3: CLASSIC ===
        const pageWidth = doc.internal.pageSize.width
        if (logo) {
          doc.addImage(logo, 'JPEG', (pageWidth/2) - 10, 10, 20, 20)
        }

        doc.setFontSize(22)
        doc.setTextColor(themeColor)
        doc.text("INVOICE", pageWidth/2, 40, { align: 'center' })

        doc.setDrawColor(0,0,0)
        doc.rect(14, 50, 182, 25)
        
        doc.setTextColor(0,0,0)
        doc.setFontSize(10)
        doc.text("BILLED TO:", 18, 58)
        doc.setFont(font, 'bold')
        doc.text(selectedClient.name || '', 18, 65)
        doc.setFont(font, 'normal')
        
        doc.text(`Invoice Date: ${format(new Date(invoice.created_at), 'dd MMM yyyy')}`, 120, 58)
        doc.text(`Payment Terms: ${invoice.payment_terms}`, 120, 65)

        autoTable(doc, {
          startY: 85,
          head: [['Item Description', 'Quantity', 'Unit Price', 'Tax', 'Line Total']],
          body: items.map(item => [
              item.description, item.quantity, `$${item.price}`, `${item.tax}%`, 
              `$${((item.quantity * Number(item.price||0)) * (1 + Number(item.tax||0)/100)).toFixed(2)}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [50, 50, 50], textColor: [255,255,255] },
          styles: { font: font, halign: 'center' },
          columnStyles: { 0: { halign: 'left' } }
        })
      }

      const finalY = (doc.lastAutoTable?.finalY || 60) + 15
      doc.setFontSize(14)
      doc.setTextColor(themeColor)
      doc.text(`Grand Total: $${invoice.total_amount}`, 196, finalY, { align: 'right' })

      doc.save(`Invoice_${selectedClient.name}.pdf`)

    } catch(error) { 
      console.error("PDF Error:", error)
      alert("PDF Generation Failed") 
    }
  }

  // --- FILTER LOGIC & HELPERS ---
  const getInvoiceStatus = (invoice) => {
    if (invoice.status === 'Paid') return 'Paid'
    const dueDate = parseISO(invoice.due_date)
    if (isPast(dueDate) && !isToday(dueDate)) return 'Overdue'
    return invoice.status
  }

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === 'All') return true
    return getInvoiceStatus(inv) === statusFilter
  })

  const getStatusColor = (status) => {
    switch(status) {
      case 'Paid': return { bg: '#dcfce7', text: '#166534' }
      case 'Overdue': return { bg: '#fee2e2', text: '#991b1b' }
      case 'Sent': return { bg: '#dbeafe', text: '#1e40af' }
      default: return { bg: '#f1f5f9', text: '#475569' }
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
                      <td style={{ color: realStatus === 'Overdue' ? '#dc2626' : 'inherit', fontWeight: realStatus === 'Overdue' ? '600' : '400' }}>
                        {format(parseISO(inv.due_date), 'dd MMM yyyy')}
                      </td>
                      <td style={{ fontWeight: 'bold' }}>${inv.total_amount}</td>
                      <td>
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