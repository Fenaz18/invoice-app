# 🧾 Invoice Generator App

A modern, full-stack Invoice Management Application built with **React** and **Supabase**. This application allows freelancers and small businesses to manage clients, create professional invoices, and track payments with a real-time dashboard.

🔴 **Live Demo:** [Insert your Vercel Link Here]  
*(e.g., https://my-invoice-app.vercel.app)*

---

## ✨ Features

### 🔐 Authentication & Security
* **User Sign Up / Login:** Secure authentication using Supabase Auth.
* **Protected Routes:** Only logged-in users can access the dashboard.
* **Data Isolation:** Users can only see their own clients and invoices.

### 👥 Client Management
* **Add & Edit Clients:** Store client details (Name, Email, Phone, Address).
* **Search:** Real-time search to find clients instantly.
* **Validation:** Prevents saving incomplete data.

### 📝 Invoice Creation
* **Dynamic Line Items:** Add multiple products/services with auto-calculating totals.
* **Tax Calculation:** Set tax rates per item.
* **Design Templates:** Choose from **Modern**, **Minimalist**, or **Classic** PDF layouts.
* **Customization:** Upload a company logo, change theme colors, and select fonts.
* **Live Preview:** Preview the PDF in a new tab before saving.

### 📊 Dashboard & Analytics
* **Real-time Stats:** View total clients, invoices sent, and total revenue.
* **Status Tracking:** Track invoices by status (**Draft**, **Sent**, **Paid**, **Overdue**).
* **Smart Alerts:** Automatically marks invoices as "Overdue" if the due date passes.

### 📄 Output
* **PDF Generation:** Generates professional-grade PDFs using `jspdf-autotable`.
* **Email Simulation:** Simulates sending invoices to clients via email.

---

## 🛠️ Tech Stack

* **Frontend:** React.js (Vite)
* **Styling:** CSS3 (Responsive Grid Layouts)
* **Database:** Supabase (PostgreSQL)
* **Auth:** Supabase Auth
* **PDF Engine:** jsPDF & jspdf-autotable
* **Icons:** Lucide React

---

## 📸 Screenshots

### 1. Dashboard
*(Add your dashboard screenshot here)*
![Dashboard Screenshot](./screenshots/dashboard.png)

### 2. Create Invoice & Design
*(Add your design panel screenshot here)*
![Create Invoice](./screenshots/create-invoice.png)

### 3. Generated PDF
*(Add your PDF screenshot here)*
![PDF Output](./screenshots/pdf-sample.png)

---

## 🚀 Getting Started

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/invoice-app.git](https://github.com/YOUR_USERNAME/invoice-app.git)
cd invoice-app

### 2. Install Dependencies
```bash
npm install

### 3. Configure Environment Variables
Create a .env file in the root folder and add your Supabase credentials:

```Code snippet

VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

### 4. Run the App
``` bash
npm run dev
Open http://localhost:5173 in your browser.


###  🗄️ Database Schema (Supabase)
This app requires 3 tables in Supabase:

clients

id (uuid, primary key)
user_id (uuid, references auth.users)
name, email, phone, address (text)
created_at (timestamp)

invoices

id (uuid, primary key)
user_id (uuid)
client_id (uuid, references clients)
total_amount (numeric)
status (text: 'Draft', 'Sent', 'Paid')
due_date (date)
payment_terms (text)

invoice_items

id (uuid, primary key)
invoice_id (uuid, references invoices)
description (text)
quantity, price, tax (numeric)

👤 Author
Built by [Fenaz] Check out my GitHub: github.com/YOUR_USERNAME