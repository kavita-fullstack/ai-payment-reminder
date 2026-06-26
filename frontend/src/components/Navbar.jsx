import React from 'react';
import { MdLogout, MdNotifications } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = ({ title, subtitle }) => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-title">{title}</span>
        {subtitle && <span className="navbar-subtitle">{subtitle}</span>}
      </div>
      <div className="navbar-right">
        <button className="btn-logout" onClick={handleLogout}>
          <MdLogout />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
