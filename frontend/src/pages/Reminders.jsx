import React, { useState, useEffect } from 'react';
import { MdEmail, MdAutoAwesome, MdContentCopy, MdCheckCircle, MdClose, MdSend, MdHistory } from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const TONE_OPTIONS = [
  { value: 'friendly', label: '😊 Friendly', desc: 'Warm, understanding tone — best for first reminders' },
  { value: 'firm', label: '📋 Firm', desc: 'Professional, clear urgency — for follow-ups' },
  { value: 'urgent', label: '🚨 Urgent', desc: 'Strong, direct — for critically overdue invoices' },
];

const EscLabel = { 1: 'Friendly', 2: 'Firm', 3: 'Urgent', 4: 'Legal Notice' };
const EscColor = { 1: '#16a34a', 2: '#d97706', 3: '#ea580c', 4: '#dc2626' };

const Reminders = () => {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');

  const [selectedInvoice, setSelectedInvoice] = useState('');
  const [tone, setTone] = useState('friendly');
  const [generated, setGenerated] = useState(null);

  const fetchData = async () => {
    try {
      const [invRes, histRes] = await Promise.all([
        api.get('/api/invoices/', { params: { status: null } }),
        api.get('/api/reminders/with-details')
      ]);
      const unpaid = invRes.data.filter(i => i.status !== 'paid');
      setInvoices(unpaid);
      setHistory(histRes.data);

      if (location.state?.invoice_id) {
        setSelectedInvoice(String(location.state.invoice_id));
      }
    } catch (e) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedInv = invoices.find(i => String(i.id) === String(selectedInvoice));

  const handleGenerate = async () => {
    if (!selectedInvoice) { toast.error('Please select an invoice'); return; }
    setGenerating(true);
    setGenerated(null);
    try {
      const res = await api.post('/api/predictions/generate-email', {
        invoice_id: parseInt(selectedInvoice),
        tone
      });
      setGenerated(res.data);
      toast.success('✨ AI email generated successfully!');
      fetchData();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to generate email'); }
    finally { setGenerating(false); }
  };

  const handleCopy = () => {
    if (!generated) return;
    const text = `Subject: ${generated.subject}\n\n${generated.body}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success('Email copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSendEmail = async () => {
    if (!generated?.reminder_id) { toast.error('Please generate an email first'); return; }
    setSending(true);
    try {
      const res = await api.post(`/api/predictions/send-email/${generated.reminder_id}`);
      if (res.data.success) {
        toast.success(`📧 Email sent to ${generated.customer_email}!`);
        setGenerated(prev => ({ ...prev, emailSent: true }));
        fetchData();
      } else {
        toast.error(res.data.message || 'Failed to send email');
      }
    } catch (e) {
      const msg = e.response?.data?.detail || e.response?.data?.message || 'Failed to send email';
      toast.error(msg);
    }
    finally { setSending(false); }
  };

  const handleSendFromHistory = async (reminderId, customerEmail) => {
    try {
      const res = await api.post(`/api/predictions/send-email/${reminderId}`);
      if (res.data.success) {
        toast.success(`📧 Email sent to ${customerEmail}!`);
        fetchData();
      } else {
        toast.error(res.data.message || 'Failed to send email');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleMarkSent = async (id) => {
    try {
      await api.patch(`/api/reminders/${id}/mark-sent`);
      toast.success('Marked as sent');
      fetchData();
    } catch (e) { toast.error('Failed to update'); }
  };

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Email Reminders</h1>
          <p>Generate and send personalized payment reminder emails using Claude AI</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={`btn ${activeTab === 'generate' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('generate')}><MdAutoAwesome /> Generate</button>
          <button className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('history')}><MdHistory /> History ({history.length})</button>
        </div>
      </div>

      {activeTab === 'generate' && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Left: Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header"><h3>⚙️ Email Configuration</h3></div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Select Invoice *</label>
                  <select className="form-control" value={selectedInvoice}
                    onChange={e => { setSelectedInvoice(e.target.value); setGenerated(null); }}>
                    <option value="">— Choose an invoice —</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} | {inv.customer?.name} | {fmt(inv.amount)} | {inv.status}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedInv && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                      {[
                        ['Customer', selectedInv.customer?.name],
                        ['Company', selectedInv.customer?.company || '—'],
                        ['Email', selectedInv.customer?.email || '—'],
                        ['Amount', fmt(selectedInv.amount)],
                        ['Due Date', new Date(selectedInv.due_date).toLocaleDateString('en-IN')],
                        ['Status', selectedInv.status.toUpperCase()],
                        ['Days Overdue', selectedInv.days_overdue > 0 ? `${selectedInv.days_overdue} days` : 'Not overdue'],
                        ['Risk Level', selectedInv.risk_level || 'LOW'],
                        ['Escalation', `Level ${selectedInv.escalation_level || 1} — ${EscLabel[selectedInv.escalation_level || 1]}`],
                      ].map(([label, val], i) => (
                        <div key={i}>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}>{label}: </span>
                          <span style={{ fontWeight: 600 }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    {selectedInv.recommended_action && (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef3c7', borderRadius: 6, fontSize: 12, color: '#92400e' }}>
                        💡 <strong>Recommended:</strong> {selectedInv.recommended_action}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Tone</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {TONE_OPTIONS.map(opt => (
                      <label key={opt.value} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
                        border: `2px solid ${tone === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 8, cursor: 'pointer', background: tone === opt.value ? 'var(--primary-light)' : 'var(--surface)',
                        transition: 'all 0.15s'
                      }}>
                        <input type="radio" name="tone" value={opt.value} checked={tone === opt.value}
                          onChange={e => setTone(e.target.value)} style={{ marginTop: 2 }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button className="btn btn-primary btn-lg" onClick={handleGenerate}
                  disabled={generating || !selectedInvoice} style={{ width: '100%', justifyContent: 'center' }}>
                  <MdAutoAwesome />
                  {generating ? 'Claude AI is writing...' : 'Generate AI Email'}
                </button>
                {generating && (
                  <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                    ✨ Claude is crafting a personalized email...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Email Preview */}
          <div>
            {generated ? (
              <div className="card">
                <div className="card-header">
                  <h3>📧 Generated Email</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={handleCopy}>
                      {copied ? <MdCheckCircle style={{ color: 'var(--success)' }} /> : <MdContentCopy />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleSendEmail}
                      disabled={sending || generated.emailSent}
                      title={`Send email to ${generated.customer_email}`}
                    >
                      <MdSend />
                      {sending ? 'Sending...' : generated.emailSent ? '✅ Sent!' : 'Send Email'}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {/* Metadata strip */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className={`badge risk-${generated.risk_level?.toLowerCase()}`}>{generated.risk_level} Risk</span>
                    <span className="badge badge-info">{generated.tone.charAt(0).toUpperCase() + generated.tone.slice(1)} Tone</span>
                    <span style={{ background: '#f1f5f9', color: EscColor[generated.escalation_level] || '#64748b', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                      Escalation L{generated.escalation_level}
                    </span>
                  </div>

                  {/* To field */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 60 }}>To:</span>
                    <span>{generated.customer_name} &lt;{generated.customer_email}&gt;</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600, minWidth: 60 }}>Subject:</span>
                    <span style={{ fontWeight: 500 }}>{generated.subject}</span>
                  </div>

                  <div className="email-preview">{generated.body}</div>

                  {/* Send info */}
                  <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
                    <MdEmail style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    <strong>Ready to send:</strong> Click <em>Send Email</em> above to deliver this to <strong>{generated.customer_email}</strong> via SMTP. Make sure your SMTP settings are configured in <code>.env</code>.
                  </div>

                  <div style={{ marginTop: 10, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, fontSize: 12, color: '#166534', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MdCheckCircle style={{ flexShrink: 0, marginTop: 1 }} />
                    <div><strong>AI Action Taken:</strong> {generated.recommended_action}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ height: '100%', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="empty-state">
                  <MdEmail style={{ fontSize: 56, opacity: 0.2, display: 'block', margin: '0 auto 16px' }} />
                  <h3>No Email Generated Yet</h3>
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                    Select an invoice and tone, then click<br /><strong>"Generate AI Email"</strong> to get started.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="card-header"><h3>📬 Reminder History ({history.length})</h3></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Tone</th>
                  <th>Escalation</th>
                  <th>Amount</th>
                  <th>Generated At</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map(r => (
                  <tr key={r.id}>
                    <td><span className="font-medium">{r.invoice_number}</span></td>
                    <td>
                      <div>{r.customer_name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{r.customer_email}</div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 12 }} className="truncate">{r.subject}</span>
                    </td>
                    <td>
                      <span className={`badge ${r.tone === 'friendly' ? 'badge-success' : r.tone === 'firm' ? 'badge-warning' : 'badge-danger'}`}>
                        {r.tone}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: EscColor[r.escalation_level], fontWeight: 600, fontSize: 12 }}>
                        L{r.escalation_level} — {EscLabel[r.escalation_level]}
                      </span>
                    </td>
                    <td className="font-bold">{fmt(r.amount)}</td>
                    <td style={{ fontSize: 12 }}>
                      {new Date(r.sent_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td>
                      <span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-info'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          title={`Send email to ${r.customer_email}`}
                          onClick={() => handleSendFromHistory(r.id, r.customer_email)}
                        >
                          <MdSend /> Send
                        </button>
                        {r.status !== 'sent' && (
                          <button className="btn btn-outline btn-sm" onClick={() => handleMarkSent(r.id)}>
                            <MdCheckCircle /> Mark Sent
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted" style={{ padding: 48 }}>
                      No reminders generated yet. Go to the Generate tab to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
