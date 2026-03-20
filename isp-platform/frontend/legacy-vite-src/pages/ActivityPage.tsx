import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ActivityLog } from '../types';
import { format } from 'date-fns';
import { 
  Users, 
  Box, 
  Cable, 
  Activity,
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';

const ActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivities({ limit: 100 });
      setActivities(data);
    } catch (err) {
      setError('Failed to load activity logs');
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
        return <Users className="w-5 h-5 text-green-400" />;
      case 'mst_maintenance':
      case 'mst_created':
        return <Box className="w-5 h-5 text-yellow-400" />;
      case 'fibre_spliced':
      case 'fibre_route_created':
        return <Cable className="w-5 h-5 text-blue-400" />;
      case 'alert_created':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getActivityTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      client_created: 'bg-green-500/20 text-green-400',
      client_activated: 'bg-green-500/20 text-green-400',
      client_connected: 'bg-green-500/20 text-green-400',
      mst_maintenance: 'bg-yellow-500/20 text-yellow-400',
      mst_created: 'bg-blue-500/20 text-blue-400',
      fibre_spliced: 'bg-blue-500/20 text-blue-400',
      fibre_route_created: 'bg-blue-500/20 text-blue-400',
      alert_created: 'bg-red-500/20 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[type] || 'bg-gray-500/20 text-gray-400'}`}>
        {type.replace(/_/g, ' ')}
      </span>
    );
  };

  const filteredActivities = filter
    ? activities.filter((a) => a.action_type === filter)
    : activities;

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
          onClick={loadActivities}
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Log</h1>
          <p className="text-dark-400">Track all system activities and changes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadActivities}
            className="p-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-dark-300" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-dark-400" />
          <span className="text-dark-300">Filter by:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Activities</option>
            <option value="client_created">Client Created</option>
            <option value="client_connected">Client Connected</option>
            <option value="mst_created">MST Created</option>
            <option value="fibre_route_created">Fibre Route Created</option>
            <option value="alert_created">Alerts</option>
          </select>
          <span className="text-dark-400 text-sm">
            Showing {filteredActivities.length} of {activities.length} activities
          </span>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <div className="p-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold text-white">Recent Activities</h2>
        </div>
        
        <div className="divide-y divide-dark-700">
          {filteredActivities.length === 0 ? (
            <div className="p-8 text-center">
              <Activity className="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p className="text-dark-400">No activities found</p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className="p-4 hover:bg-dark-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {getActivityIcon(activity.action_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      {getActivityTypeBadge(activity.action_type)}
                      <span className="text-xs text-dark-400">
                        {format(new Date(activity.created_at), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-white">{activity.action_description}</p>
                    {(activity.client_id || activity.mst_id || activity.fibre_route_id) && (
                      <p className="text-xs text-dark-500 mt-1">
                        Related IDs:
                        {activity.client_id ? ` client=${activity.client_id}` : ''}
                        {activity.mst_id ? ` mst=${activity.mst_id}` : ''}
                        {activity.fibre_route_id ? ` route=${activity.fibre_route_id}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-dark-500">
                    User #{activity.user_id}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {activities.filter((a) => a.action_type.includes('client')).length}
              </p>
              <p className="text-sm text-dark-400">Client Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center gap-3">
            <Box className="w-8 h-8 text-yellow-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {activities.filter((a) => a.action_type.includes('mst')).length}
              </p>
              <p className="text-sm text-dark-400">MST Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center gap-3">
            <Cable className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {activities.filter((a) => a.action_type.includes('fibre')).length}
              </p>
              <p className="text-sm text-dark-400">Fibre Activities</p>
            </div>
          </div>
        </div>
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-white">
                {activities.filter((a) => a.action_type.includes('alert')).length}
              </p>
              <p className="text-sm text-dark-400">Alerts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityPage;
