import React from 'react';
import { NavLink } from 'react-router-dom';
import { MdDashboard, MdPeople, MdReceipt, MdAutoGraph, MdEmail, MdSmartToy, MdPsychology } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: <MdDashboard />, label: 'Dashboard', exact: true },
  { to: '/customers', icon: <MdPeople />, label: 'Customers' },
  { to: '/invoices', icon: <MdReceipt />, label: 'Invoices' },
  { to: '/predictions', icon: <MdAutoGraph />, label: 'AI Predictions' },
  { to: '/reminders', icon: <MdEmail />, label: 'AI Reminders' },
  { to: '/agent', icon: <MdPsychology />, label: 'Agentic AI', highlight: true },
];

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-inner">
          <div className="sidebar-logo-icon">
            <MdSmartToy color="white" />
          </div>
          <div className="sidebar-logo-text">
            <h2>PayRemind AI</h2>
            <span>Smart Collections</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            style={item.highlight ? { position: 'relative' } : {}}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.highlight && (
              <span style={{
                marginLeft: 'auto',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                letterSpacing: '0.5px',
              }}>NEW</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.username?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="sidebar-user-info">
            <p>{user?.username || 'Admin'}</p>
            <span>{user?.email || 'admin@payremind.ai'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
