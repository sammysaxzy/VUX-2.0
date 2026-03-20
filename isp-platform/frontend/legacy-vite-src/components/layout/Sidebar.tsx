import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Box,
  Cable,
  Map,
  Activity,
  CreditCard,
  Ticket,
  LogOut,
  Wifi
} from 'lucide-react';
import { useAuthStore } from '../../store';

const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/mst', icon: Box, label: 'MST Boxes' },
    { path: '/fibre', icon: Cable, label: 'Fibre Network' },
    { path: '/map', icon: Map, label: 'Network Map' },
    { path: '/network', icon: Wifi, label: 'Network Devices' },
    { path: '/billing', icon: CreditCard, label: 'Billing' },
    { path: '/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/activity', icon: Activity, label: 'Activity Log' },
  ];

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      {/* Logo Section */}
      <div className="p-4 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ISP Platform</h1>
            <p className="text-xs text-dark-400">Operations Center</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-500/20 text-primary-400 border-l-4 border-primary-500'
                      : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-dark-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-dark-400 truncate">{user?.role || 'user'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-4 py-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
