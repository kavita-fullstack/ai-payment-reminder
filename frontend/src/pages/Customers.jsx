import React, { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdPeople, MdClose } from 'react-icons/md';
import api from '../api/axios';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const BLANK = { name: '', email: '', phone: '', company: '', credit_score: 700 };

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/api/customers/');
      setCustomers(res.data);
    } catch (e) { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, []);

  const openAdd = () => { setEditing(null); setForm(BLANK); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email, phone: c.phone || '', company: c.company || '', credit_score: c.credit_score }); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/customers/${editing.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/api/customers/', form);
        toast.success('Customer added');
      }
      fetchCustomers();
      closeModal();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving customer'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer and all their invoices?')) return;
    try {
      await api.delete(`/api/customers/${id}`);
      toast.success('Customer deleted');
      fetchCustomers();
    } catch (e) { toast.error('Failed to delete'); }
  };

  const getRiskClass = (c) => {
    const rate = c.late_payments / Math.max(c.total_invoices, 1);
    if (rate > 0.5 || c.credit_score < 500) return 'risk-high';
    if (rate > 0.2 || c.credit_score < 650) return 'risk-medium';
    return 'risk-low';
  };

  const getRiskLabel = (c) => {
    const rate = c.late_payments / Math.max(c.total_invoices, 1);
    if (rate > 0.5 || c.credit_score < 500) return 'HIGH';
    if (rate > 0.2 || c.credit_score < 650) return 'MEDIUM';
    return 'LOW';
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Customers ({customers.length})</h1>
          <p>Manage customer accounts and payment history</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><MdAdd /> Add Customer</button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Customers</h3>
          <input className="form-control" style={{ width: 250 }}
            placeholder="🔍 Search customers..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Invoices</th>
                <th>Late Payments</th>
                <th>Avg Days</th>
                <th>Credit Score</th>
                <th>Outstanding</th>
                <th>Risk</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{c.company}</div>
                  </td>
                  <td>
                    <div>{c.email}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{c.phone}</div>
                  </td>
                  <td><span className="badge badge-info">{c.total_invoices}</span></td>
                  <td>
                    <span className={`badge ${c.late_payments > 4 ? 'badge-danger' : c.late_payments > 1 ? 'badge-warning' : 'badge-success'}`}>
                      {c.late_payments}
                    </span>
                  </td>
                  <td>{c.avg_payment_days.toFixed(0)} days</td>
                  <td>
                    <span style={{ fontWeight: 600, color: c.credit_score < 500 ? 'var(--danger)' : c.credit_score < 650 ? 'var(--warning)' : 'var(--success)' }}>
                      {c.credit_score}
                    </span>
                  </td>
                  <td className="font-bold">{fmt(c.total_outstanding)}</td>
                  <td><span className={`badge ${getRiskClass(c)}`}>{getRiskLabel(c)}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}><MdEdit /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}><MdDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Customer name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-control" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91-XXXXXXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Credit Score (300-850)</label>
                  <input className="form-control" type="number" min={300} max={850} value={form.credit_score} onChange={e => setForm({ ...form, credit_score: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Customer' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
