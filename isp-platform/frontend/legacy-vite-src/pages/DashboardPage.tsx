import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Box, 
  Cable, 
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Ticket,
  Router
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { api } from '../services/api';
import { DashboardStats, ActivityLog } from '../types';
import { formatDistanceToNow } from 'date-fns';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client_created':
      case 'client_activated':
      case 'client_connected':
        return <Users className="w-4 h-4 text-green-400" />;
      case 'mst_maintenance':
      case 'mst_created':
        return <Box className="w-4 h-4 text-yellow-400" />;
      case 'fibre_spliced':
      case 'fibre_route_created':
        return <Cable className="w-4 h-4 text-blue-400" />;
      case 'alert_created':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-dark-400">{error}</p>
        <button 
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-dark-400">Overview of your ISP operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Clients"
          value={stats?.total_clients || 0}
          icon={<Users className="w-6 h-6" />}
        />
        <StatCard
          title="Active Clients"
          value={stats?.active_clients || 0}
          icon={<CheckCircle className="w-6 h-6" />}
        />
        <StatCard
          title="MST Boxes"
          value={stats?.total_mst_boxes || 0}
          icon={<Box className="w-6 h-6" />}
        />
        <StatCard
          title="Network Utilization"
          value={`${(stats?.average_utilization || 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Revenue"
          value={`NGN ${Number(stats?.revenue_total || 0).toLocaleString()}`}
          icon={<CreditCard className="w-6 h-6" />}
        />
        <StatCard
          title="Open Tickets"
          value={stats?.open_tickets || 0}
          subtitle={`Offline devices: ${stats?.offline_devices || 0}`}
          icon={<Ticket className="w-6 h-6" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Status Distribution */}
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h2 className="text-lg font-semibold text-white mb-4">Client Status Distribution</h2>
          <div className="space-y-4">
            {stats?.client_status_distribution && Object.entries(stats.client_status_distribution).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {status === 'active' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : status === 'pending' ? (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-dark-300 capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        status === 'active' ? 'bg-green-500' : 
                        status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${((count as number) / (stats?.total_clients || 1)) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-white font-medium w-12 text-right">{count as number}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {stats?.recent_activities?.slice(0, 5).map((activity: ActivityLog) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {getActivityIcon(activity.action_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{activity.action_description}</p>
                  <p className="text-xs text-dark-400">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {(!stats?.recent_activities || stats.recent_activities.length === 0) && (
              <p className="text-dark-400 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <button
            onClick={() => navigate('/clients')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Users className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Add Client</span>
          </button>
          <button
            onClick={() => navigate('/mst')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Box className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Add MST Box</span>
          </button>
          <button
            onClick={() => navigate('/fibre')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Cable className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Manage Fibre</span>
          </button>
          <button
            onClick={() => navigate('/activity')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Activity className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <span className="text-sm text-dark-300">View Logs</span>
          </button>
          <button
            onClick={() => navigate('/network')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Router className="w-8 h-8 text-info-500 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Network</span>
          </button>
          <button
            onClick={() => navigate('/billing')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <CreditCard className="w-8 h-8 text-success-500 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Billing</span>
          </button>
          <button
            onClick={() => navigate('/tickets')}
            className="p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-center"
          >
            <Ticket className="w-8 h-8 text-warning-500 mx-auto mb-2" />
            <span className="text-sm text-dark-300">Tickets</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
