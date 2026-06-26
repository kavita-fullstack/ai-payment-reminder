import React, { useState, useEffect } from 'react';
import { MdAdd, MdEdit, MdDelete, MdClose, MdCheckCircle, MdAutoGraph, MdEmail } from 'react-icons/md';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const StatusBadge = ({ status }) => {
  const map = { paid: 'badge-success', overdue: 'badge-danger', pending: 'badge-warning' };
  return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status}</span>;
};

const RiskBadge = ({ level }) => (
  <span className={`badge ${level === 'HIGH' ? 'risk-high' : level === 'MEDIUM' ? 'risk-medium' : 'risk-low'}`}>{level}</span>
);

const BLANK = { invoice_number: '', customer_id: '', amount: '', due_date: '', description: '' };

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        api.get('/api/invoices/'),
        api.get('/api/customers/')
      ]);
      setInvoices(invRes.data);
      setCustomers(custRes.data);
    } catch (e) { toast.error('Failed to load invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditing(null);
    const nextNum = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;
    setForm({ ...BLANK, invoice_number: nextNum });
    setModal(true);
  };

  const openEdit = (inv) => {
    setEditing(inv);
    setForm({
      invoice_number: inv.invoice_number,
      customer_id: inv.customer_id,
      amount: inv.amount,
      due_date: inv.due_date ? inv.due_date.slice(0, 10) : '',
      description: inv.description || ''
    });
    setModal(true);
  };

  const closeModal = () => { setModal(false); setEditing(null); setForm(BLANK); };

  const handleSave = async () => {
    if (!form.invoice_number || !form.customer_id || !form.amount || !form.due_date) {
      toast.error('Please fill all required fields'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        customer_id: parseInt(form.customer_id),
        amount: parseFloat(form.amount),
        due_date: new Date(form.due_date).toISOString()
      };
      if (editing) {
        await api.put(`/api/invoices/${editing.id}`, payload);
        toast.success('Invoice updated');
      } else {
        await api.post('/api/invoices/', payload);
        toast.success('Invoice created');
      }
      fetchData(); closeModal();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error saving invoice'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this invoice?')) return;
    try { await api.delete(`/api/invoices/${id}`); toast.success('Invoice deleted'); fetchData(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const handleMarkPaid = async (id) => {
    try { await api.patch(`/api/invoices/${id}/mark-paid`); toast.success('✅ Marked as paid'); fetchData(); }
    catch (e) { toast.error('Failed to update'); }
  };

  const goToReminders = (invId) => navigate('/reminders', { state: { invoice_id: invId } });

  const filtered = invoices.filter(inv => {
    const matchSearch = inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totals = {
    total: invoices.reduce((s, i) => i.status !== 'paid' ? s + i.amount : s, 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Invoices ({invoices.length})</h1>
          <p>Track and manage all customer invoices</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><MdAdd /> New Invoice</button>
      </div>

      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Outstanding', value: fmt(totals.total), color: 'var(--warning)' },
          { label: 'Overdue Amount', value: fmt(totals.overdue), color: 'var(--danger)' },
          { label: 'Total Invoices', value: invoices.length, color: 'var(--primary)' },
          { label: 'Overdue Count', value: invoices.filter(i => i.status === 'overdue').length, color: 'var(--danger)' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h3>Invoice List</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input className="form-control" style={{ width: 220 }}
              placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-control" style={{ width: 140 }}
              value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Overdue</th>
                <th>Escalation</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id}>
                  <td><span className="font-medium">{inv.invoice_number}</span></td>
                  <td>
                    <div className="font-medium">{inv.customer?.name || 'N/A'}</div>
                    <div className="text-muted" style={{ fontSize: 11 }}>{inv.customer?.company}</div>
                  </td>
                  <td className="font-bold">{fmt(inv.amount)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="risk-bar" style={{ width: 60 }}>
                        <div className={`risk-bar-fill ${inv.risk_level?.toLowerCase()}`} style={{ width: `${inv.risk_score}%` }} />
                      </div>
                      <RiskBadge level={inv.risk_level || 'LOW'} />
                    </div>
                  </td>
                  <td>
                    {inv.days_overdue > 0
                      ? <span className="text-danger font-bold">{inv.days_overdue}d</span>
                      : <span className="text-success">—</span>}
                  </td>
                  <td>
                    <span className={`badge esc-${inv.escalation_level || 1}`}>
                      Level {inv.escalation_level || 1}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
                      {inv.status !== 'paid' && (
                        <button className="btn btn-success btn-sm" title="Mark Paid" onClick={() => handleMarkPaid(inv.id)}>
                          <MdCheckCircle />
                        </button>
                      )}
                      <button className="btn btn-outline btn-sm" title="Generate Email" onClick={() => goToReminders(inv.id)}>
                        <MdEmail />
                      </button>
                      <button className="btn btn-outline btn-sm" title="Edit" onClick={() => openEdit(inv)}>
                        <MdEdit />
                      </button>
                      <button className="btn btn-danger btn-sm" title="Delete" onClick={() => handleDelete(inv.id)}>
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Invoice' : 'Create New Invoice'}</h3>
              <button className="modal-close" onClick={closeModal}><MdClose /></button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Invoice Number *</label>
                  <input className="form-control" value={form.invoice_number}
                    onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select className="form-control" value={form.customer_id}
                    onChange={e => setForm({ ...form, customer_id: e.target.value })}>
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input className="form-control" type="number" min={0} value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="50000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input className="form-control" type="date" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Services or products description..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Invoices;
