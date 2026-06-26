import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { MdReceipt, MdWarning, MdCheckCircle, MdPeople, MdTrendingUp, MdAttachMoney, MdError, MdSecurity } from 'react-icons/md';
import api from '../api/axios';

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#2563eb'];

const RiskBadge = ({ level }) => (
  <span className={`badge ${level === 'HIGH' ? 'risk-high' : level === 'MEDIUM' ? 'risk-medium' : 'risk-low'}`}>
    {level}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = { paid: 'badge-success', overdue: 'badge-danger', pending: 'badge-warning' };
  return <span className={`badge ${map[status] || 'badge-secondary'}`}>{status}</span>;
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sRes, mRes, rRes] = await Promise.all([
          api.get('/api/invoices/stats'),
          api.get('/api/invoices/monthly-revenue'),
          api.get('/api/invoices/recent')
        ]);
        setStats(sRes.data);
        setMonthly(mRes.data);
        setRecent(rRes.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

  const pieData = stats ? [
    { name: 'Paid', value: stats.paid_invoices },
    { name: 'Pending', value: stats.pending_invoices },
    { name: 'Overdue', value: stats.overdue_invoices },
  ].filter(d => d.value > 0) : [];

  return (
    <div>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><MdReceipt /></div>
          <div className="stat-info">
            <p className="stat-label">Total Invoices</p>
            <p className="stat-value">{stats?.total_invoices || 0}</p>
            <p className="stat-sub">{stats?.paid_invoices || 0} paid</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><MdWarning /></div>
          <div className="stat-info">
            <p className="stat-label">Overdue Invoices</p>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>{stats?.overdue_invoices || 0}</p>
            <p className="stat-sub">{stats?.high_risk_count || 0} high risk</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><MdAttachMoney /></div>
          <div className="stat-info">
            <p className="stat-label">Outstanding</p>
            <p className="stat-value" style={{ fontSize: 16 }}>{fmt(stats?.total_outstanding || 0)}</p>
            <p className="stat-sub">Needs collection</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><MdCheckCircle /></div>
          <div className="stat-info">
            <p className="stat-label">Collected</p>
            <p className="stat-value" style={{ fontSize: 16, color: 'var(--success)' }}>{fmt(stats?.total_collected || 0)}</p>
            <p className="stat-sub">Total revenue</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><MdPeople /></div>
          <div className="stat-info">
            <p className="stat-label">Customers</p>
            <p className="stat-value">{stats?.total_customers || 0}</p>
            <p className="stat-sub">Active accounts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><MdSecurity /></div>
          <div className="stat-info">
            <p className="stat-label">High Risk</p>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>{stats?.high_risk_count || 0}</p>
            <p className="stat-sub">Need attention</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MdTrendingUp /></div>
          <div className="stat-info">
            <p className="stat-label">Pending</p>
            <p className="stat-value">{stats?.pending_invoices || 0}</p>
            <p className="stat-sub">Due soon</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><MdError /></div>
          <div className="stat-info">
            <p className="stat-label">Collection Rate</p>
            <p className="stat-value">
              {stats?.total_invoices
                ? Math.round((stats.paid_invoices / stats.total_invoices) * 100)
                : 0}%
            </p>
            <p className="stat-sub">Payment success</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2 mb-6">
        <div className="card">
          <div className="card-header"><h3>📈 Monthly Revenue</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [fmt(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>🍩 Invoice Status</h3></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card">
        <div className="card-header">
          <h3>🧾 Recent Invoices</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(inv => (
                <tr key={inv.id}>
                  <td><span className="font-medium">{inv.invoice_number}</span></td>
                  <td>
                    <div>{inv.customer_name}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{inv.company}</div>
                  </td>
                  <td className="font-bold">{fmt(inv.amount)}</td>
                  <td>{new Date(inv.due_date).toLocaleDateString('en-IN')}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td><RiskBadge level={inv.risk_level} /></td>
                  <td>
                    {inv.days_overdue > 0
                      ? <span className="text-danger font-bold">{inv.days_overdue}d</span>
                      : <span className="text-success">On time</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
