import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import Sidebar from '../components/Sidebar'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash, Save, ArrowLeft, Eye, Upload, Palette, Type, LayoutTemplate, Image as ImageIcon } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export default function CreateInvoice() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)

  // Invoice Data
  const [clientId, setClientId] = useState('')
  const [dates, setDates] = useState({ 
    due_date: new Date().toISOString().split('T')[0], 
    payment_terms: 'Net 15' 
  })
  
  // Customization State
  const [themeColor, setThemeColor] = useState('#2563eb')
  const [font, setFont] = useState('helvetica')
  const [template, setTemplate] = useState('modern')
  const [logo, setLogo] = useState(null)

  // Line Items
  const [items, setItems] = useState([
    { id: Date.now(), description: '', quantity: 1, price: '', tax: '' }
  ])

  useEffect(() => {
    const fetchClients = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('clients').select('*').eq('user_id', user.id)
      setClients(data || [])
    }
    fetchClients()
  }, [])

  // --- ACTIONS ---
  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setLogo(reader.result)
      reader.readAsDataURL(file)
    }
  }

  const addItem = () => setItems([...items, { id: Date.now(), description: '', quantity: 1, price: '', tax: '' }])
  
  const removeItem = (id) => {
    if (items.length === 1) return 
    setItems(items.filter(item => item.id !== id))
  }

  const updateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      const tax = Number(item.tax) || 0
      return sum + (qty * price) + ((qty * price) * (tax / 100))
    }, 0).toFixed(2)
  }

  const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  // --- PDF GENERATOR ENGINE ---
  const generatePDF = (action = 'save') => {
    const doc = new jsPDF()
    const selectedClient = clients.find(c => c.id === clientId) || {}
    const rgb = hexToRgb(themeColor)

    
    doc.setFont(font)

    // --- TEMPLATE LOGIC ---
    if (template === 'modern') {
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
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 196, 30, { align: 'right' })
      doc.text(`Due Date: ${format(new Date(dates.due_date), 'dd MMM yyyy')}`, 196, 35, { align: 'right' })

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
      doc.text(`Date: ${format(new Date(), 'dd MMM yyyy')}`, 14, 35)
      doc.text(`Client: ${selectedClient.name || 'N/A'}`, 80, 35)
      doc.text(`Due: ${format(new Date(dates.due_date), 'dd MMM yyyy')}`, 150, 35)

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
      
      doc.text(`Invoice Date: ${format(new Date(), 'dd MMM yyyy')}`, 120, 58)
      doc.text(`Payment Terms: ${dates.payment_terms}`, 120, 65)

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
    doc.text(`Grand Total: $${calculateTotal()}`, 196, finalY, { align: 'right' })

    if (action === 'preview') {
      window.open(doc.output('bloburl'), '_blank')
    } else {
        return calculateTotal()
    }
  }

  // --- SAVE DB ---
  const handleSave = async () => {
    if (!clientId) return alert("Select a client first")
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const total = generatePDF('save')

      const { data: invoiceData, error: invError } = await supabase
        .from('invoices')
        .insert([{
          user_id: user.id,
          client_id: clientId,
          due_date: dates.due_date,
          payment_terms: dates.payment_terms,
          status: 'Draft',
          total_amount: total
        }])
        .select()

      if (invError) throw invError

      const formattedItems = items.map(item => ({
        invoice_id: invoiceData[0].id,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        price: Number(item.price) || 0,
        tax: Number(item.tax) || 0
      }))

      const { error: itemError } = await supabase.from('invoice_items').insert(formattedItems)
      if (itemError) throw itemError

      alert('Invoice Saved!')
      navigate('/invoices')

    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => navigate('/invoices')}>
              <ArrowLeft size={18} />
            </button>
            <h2 style={{ margin: 0 }}>New Invoice</h2>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => generatePDF('preview')}>
                <Eye size={18} /> Preview PDF
            </button>
            <button className="btn" onClick={handleSave} disabled={loading}>
                <Save size={18} /> {loading ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>

        
        <div className="invoice-section" style={{ borderLeft: `5px solid ${themeColor}` }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Palette size={20} /> Design & Template
            </h3>
            
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Column 1: Template & Font */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            <LayoutTemplate size={14}/> Template
                        </label>
                        <select value={template} onChange={(e) => setTemplate(e.target.value)} style={{ width: '100%', fontWeight: '600' }}>
                            <option value="modern">Modern (Colored)</option>
                            <option value="minimal">Minimalist (Clean)</option>
                            <option value="classic">Classic (Centered)</option>
                        </select>
                    </div>

                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            <Type size={14}/> Font Style
                        </label>
                        <select value={font} onChange={(e) => setFont(e.target.value)} style={{ width: '100%' }}>
                            <option value="helvetica">Helvetica (Modern)</option>
                            <option value="times">Times New Roman (Classic)</option>
                            <option value="courier">Courier (Typewriter)</option>
                        </select>
                    </div>
                </div>

                {/* Column 2: Color & Logo */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            <Palette size={14}/> Theme Color
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <input 
                                type="color" 
                                value={themeColor} 
                                onChange={(e) => setThemeColor(e.target.value)} 
                                style={{ 
                                    height: '35px', 
                                    width: '35px', 
                                    padding: 0, 
                                    border: 'none', 
                                    borderRadius: '50%', 
                                    overflow: 'hidden', 
                                    cursor: 'pointer',
                                    background: 'none'
                                }}
                            />
                            <span style={{ fontSize: '0.95rem', color: '#334155', fontWeight: '600', fontFamily: 'monospace' }}>
                                {themeColor.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
                            <ImageIcon size={14}/> Upload Logo
                        </label>
                        <div style={{ position: 'relative', overflow: 'hidden' }}>
                           <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleLogoUpload} 
                                style={{ width: '100%', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }} 
                           />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- CLIENT & DATES --- */}
        <div className="invoice-section">
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <label className="form-label">Bill To (Client)</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select a Client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="form-label">Due Date</label>
                <input type="date" value={dates.due_date} onChange={(e) => setDates({...dates, due_date: e.target.value})} style={{ width: '100%' }} />
              </div>
              <div>
                <label className="form-label">Payment Terms</label>
                <select value={dates.payment_terms} onChange={(e) => setDates({...dates, payment_terms: e.target.value})} style={{ width: '100%' }}>
                  <option>Net 15</option>
                  <option>Net 30</option>
                  <option>Due on Receipt</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* --- ITEMS --- */}
        <div className="invoice-section">
          <h3 style={{ marginTop: 0 }}>Items</h3>
          <div className="items-header">
            <div>Description</div>
            <div>Qty</div>
            <div>Price ($)</div>
            <div>Tax (%)</div>
            <div></div>
          </div>

          {items.map((item) => (
            <div key={item.id} className="item-row">
              <input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Item name" />
              <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} placeholder="0" />
              <input type="number" value={item.price} onChange={(e) => updateItem(item.id, 'price', e.target.value)} placeholder="0.00" />
              <input type="number" value={item.tax} onChange={(e) => updateItem(item.id, 'tax', e.target.value)} placeholder="0" />
              
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {items.length > 1 && (
                  <button className="delete-btn" onClick={() => removeItem(item.id)}>
                    <Trash size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="invoice-footer">
            <button className="btn btn-secondary" onClick={addItem}><Plus size={16} /> Add Item</button>
            <div className="total-box">
               <div className="final-total">
                <span>Total Due</span>
                <span style={{ color: themeColor }}>${calculateTotal()}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}