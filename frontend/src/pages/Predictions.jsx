import React, { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MdAutoGraph, MdRefresh, MdWarning, MdCheckCircle, MdError, MdTrendingUp } from 'react-icons/md';
import api from '../api/axios';
import toast from 'react-hot-toast';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const LEVEL_META = {
  HIGH:   { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: <MdError />, label: 'High Risk' },
  MEDIUM: { color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: <MdWarning />, label: 'Medium Risk' },
  LOW:    { color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: <MdCheckCircle />, label: 'Low Risk' },
};

const EscBadge = ({ level }) => {
  const colors = ['', '#16a34a', '#d97706', '#ea580c', '#dc2626'];
  const bgs =    ['', '#dcfce7', '#fef3c7', '#ffedd5', '#fee2e2'];
  const labels = ['', 'Friendly', 'Firm', 'Urgent', 'Legal'];
  return (
    <span style={{ background: bgs[level] || '#f1f5f9', color: colors[level] || '#64748b', fontWeight: 600, fontSize: 11, padding: '3px 9px', borderRadius: 20 }}>
      L{level}: {labels[level] || '—'}
    </span>
  );
};

const Predictions = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const fetchPredictions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get('/api/predictions/risk-all');
      setPredictions(res.data);
      if (isRefresh) toast.success('Risk scores updated with ML model');
    } catch (e) { toast.error('Failed to load predictions'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchPredictions(); }, []);

  const filtered = predictions.filter(p => {
    const matchSearch =
      p.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.company?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = riskFilter === 'all' || p.risk_level === riskFilter;
    return matchSearch && matchRisk;
  });

  // Summary stats
  const summary = {
    high: predictions.filter(p => p.risk_level === 'HIGH').length,
    medium: predictions.filter(p => p.risk_level === 'MEDIUM').length,
    low: predictions.filter(p => p.risk_level === 'LOW').length,
    highAmount: predictions.filter(p => p.risk_level === 'HIGH').reduce((s, p) => s + p.amount, 0),
  };

  // Bar chart data
  const chartData = [
    { name: 'High Risk', count: summary.high, fill: '#dc2626' },
    { name: 'Medium Risk', count: summary.medium, fill: '#f59e0b' },
    { name: 'Low Risk', count: summary.low, fill: '#22c55e' },
  ];

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Risk Predictions</h1>
          <p>ML-powered payment delay probability analysis (RandomForest Classifier)</p>
        </div>
        <button className="btn btn-primary" onClick={() => fetchPredictions(true)} disabled={refreshing}>
          <MdRefresh style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Running ML Model...' : 'Re-run Predictions'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {[
          { label: 'High Risk Invoices', value: summary.high, color: '#dc2626', bg: '#fee2e2', icon: <MdError /> },
          { label: 'Medium Risk', value: summary.medium, color: '#d97706', bg: '#fef3c7', icon: <MdWarning /> },
          { label: 'Low Risk', value: summary.low, color: '#16a34a', bg: '#dcfce7', icon: <MdCheckCircle /> },
          { label: 'High Risk Amount', value: fmt(summary.highAmount), color: '#dc2626', bg: '#fee2e2', icon: <MdTrendingUp /> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', borderRadius: 12, padding: '16px 18px', border: `1px solid var(--border)`, boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ background: s.bg, color: s.color, width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Info */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><h3>📊 Risk Distribution</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🤖 ML Model Info</h3></div>
          <div className="card-body">
            {[
              ['Model Type', 'RandomForest Classifier'],
              ['Features Used', 'Amount, Days Overdue, Late Rate, Credit Score, Avg Days, Invoice Count'],
              ['Training Data', '2,000 synthetic payment records'],
              ['Risk Threshold', 'HIGH ≥ 70% | MEDIUM ≥ 40% | LOW < 40%'],
              ['Smart Timing', 'Rule-based on days overdue + risk level'],
              ['Escalation', 'Level 1–4 based on overdue duration'],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none', gap: 12 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 12, textAlign: 'right', color: 'var(--text)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
          <h3>Invoice Risk Scores ({filtered.length})</h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-control" style={{ width: 220 }}
              placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-control" style={{ width: 140 }}
              value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
              <option value="all">All Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Days Overdue</th>
                <th>Risk Score</th>
                <th>Risk Level</th>
                <th>Escalation</th>
                <th>Smart Timing</th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const meta = LEVEL_META[p.risk_level] || LEVEL_META.LOW;
                return (
                  <tr key={i}>
                    <td><span className="font-medium">{p.invoice_number}</span></td>
                    <td>
                      <div className="font-medium">{p.customer_name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{p.company}</div>
                    </td>
                    <td className="font-bold">{fmt(p.amount)}</td>
                    <td>
                      {p.days_overdue > 0
                        ? <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{p.days_overdue}d</span>
                        : <span style={{ color: 'var(--success)' }}>Not overdue</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 70, height: 7, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${p.risk_score}%`, height: '100%', background: meta.color, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: meta.color, fontSize: 13 }}>{p.risk_score.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {meta.icon} {meta.label}
                      </span>
                    </td>
                    <td><EscBadge level={p.escalation_level} /></td>
                    <td style={{ maxWidth: 160 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.smart_timing}</span>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span style={{ fontSize: 12 }}>{p.recommended_action}</span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Predictions;
