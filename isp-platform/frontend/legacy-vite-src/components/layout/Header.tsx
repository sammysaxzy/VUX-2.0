import { Bell, Search, Menu, X, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { useUIStore, useAuthStore } from '../../store';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Header() {
  const { toggleSidebar, sidebarOpen, alerts } = useUIStore();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== '/';

  return (
    <header className="h-16 bg-dark-900 border-b border-dark-700 px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-white transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <button
          onClick={() => navigate(-1)}
          disabled={!canGoBack}
          className="p-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search clients, MSTs, routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-dark-400 hover:bg-dark-800 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          {alerts.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
          )}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.full_name?.[0] || user?.username?.[0] || 'U'}
            </span>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-white">
              {user?.full_name || user?.username}
            </p>
            <p className="text-xs text-dark-400 capitalize">
              {user?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
