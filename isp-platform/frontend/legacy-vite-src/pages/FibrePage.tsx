import { FormEvent, useEffect, useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { clientsAPI, fibreAPI, mstAPI } from '../services/api';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import type { Client, FibreCore, FibreRoute, MSTBox } from '../types';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const initialForm = {
  route_id: '',
  name: '',
  start_mst_id: '',
  end_mst_id: '',
  end_client_id: '',
  fibre_type: '12',
  installation_type: 'underground',
};

export default function FibrePage() {
  const [routes, setRoutes] = useState<FibreRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<FibreRoute | null>(null);
  const [cores, setCores] = useState<FibreCore[]>([]);
  const [mstBoxes, setMstBoxes] = useState<MSTBox[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [stats, setStats] = useState({
    total_routes: 0,
    total_cores: 0,
    used_cores: 0,
    free_cores: 0,
    faulty_cores: 0,
    total_distance_km: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesData, statsData, mstsData, clientsData] = await Promise.all([
        fibreAPI.getRoutes({ limit: 500 }),
        fibreAPI.getStats(),
        mstAPI.getAll({ limit: 500 }),
        clientsAPI.getAll({ limit: 500 }),
      ]);
      setRoutes(routesData);
      setStats(statsData);
      setMstBoxes(mstsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load fibre data:', error);
      toast.error('Failed to load fibre data');
    } finally {
      setLoading(false);
    }
  };

  const loadCores = async (routeId: number) => {
    try {
      const coresData = await fibreAPI.getRouteCores(routeId);
      setCores(coresData);
    } catch (error) {
      console.error('Failed to load cores:', error);
      toast.error('Failed to load route cores');
    }
  };

  const handleRouteSelect = (route: FibreRoute) => {
    setSelectedRoute(route);
    loadCores(route.id);
  };

  const submitCreateRoute = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.route_id || !formData.name || !formData.start_mst_id) {
      toast.error('Fill required fields: Route ID, Name, Start MST');
      return;
    }
    if (!formData.end_mst_id && !formData.end_client_id) {
      toast.error('Choose either End MST or End Client');
      return;
    }
    if (formData.end_mst_id && formData.end_client_id) {
      toast.error('Choose only one end point: MST or Client');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        route_id: formData.route_id.trim(),
        name: formData.name.trim(),
        start_mst_id: Number(formData.start_mst_id),
        end_mst_id: formData.end_mst_id ? Number(formData.end_mst_id) : undefined,
        end_client_id: formData.end_client_id ? Number(formData.end_client_id) : undefined,
        fibre_type: Number(formData.fibre_type),
        installation_type: formData.installation_type,
      };
      await fibreAPI.createRoute(payload);
      toast.success('Fibre route created');
      setShowCreateModal(false);
      setFormData(initialForm);
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to create route';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCoreStatusBadge = (status: string) => {
    const styles = {
      free: 'bg-dark-700 text-dark-300',
      used: 'bg-success-500/20 text-success-500',
      faulty: 'bg-danger-500/20 text-danger-500',
      reserved: 'bg-warning-500/20 text-warning-500',
    };
    return <span className={clsx('badge', styles[status as keyof typeof styles] || 'bg-dark-700 text-dark-300')}>{status}</span>;
  };

  const getCoreColorStyle = (color: string) => {
    const colors: Record<string, string> = {
      Blue: '#3b82f6',
      Orange: '#f97316',
      Green: '#22c55e',
      Brown: '#a16207',
      Slate: '#64748b',
      White: '#f8fafc',
      Red: '#ef4444',
      Black: '#171717',
      Yellow: '#eab308',
      Violet: '#8b5cf6',
      Rose: '#f43f5e',
      Aqua: '#06b6d4',
    };
    return colors[color] || '#64748b';
  };

  const columns: ColumnDef<FibreRoute>[] = [
    {
      accessorKey: 'route_id',
      header: 'Route ID',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.route_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'fibre_type',
      header: 'Type',
      cell: ({ row }) => <span className="badge bg-dark-700 text-dark-200">{row.original.fibre_type}-core</span>,
    },
    {
      accessorKey: 'distance_meters',
      header: 'Distance',
      cell: ({ row }) => {
        const meters = Number(row.original.distance_meters || 0);
        return meters > 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters.toFixed(0)} m`;
      },
    },
    {
      accessorKey: 'installation_type',
      header: 'Installation',
      cell: ({ row }) => (
        <span className={clsx('badge', row.original.installation_type === 'aerial' ? 'bg-info-500/20 text-info-500' : 'bg-dark-700 text-dark-300')}>
          {row.original.installation_type}
        </span>
      ),
    },
    {
      accessorKey: 'total_cores',
      header: 'Cores',
      cell: ({ row }) => <span className="text-dark-200">{row.original.total_cores}</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRouteSelect(row.original);
          }}
          className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-white transition-colors"
          title="View Cores"
        >
          <Layers className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fibre Routes</h1>
          <p className="text-dark-400 mt-1">Manage fibre network infrastructure</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          Add Route
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Total Routes</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total_routes}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Total Distance</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total_distance_km.toFixed(1)} km</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Total Cores</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total_cores}</p>
        </div>
        <div className="card bg-success-500/5 border-success-500/20">
          <p className="text-sm text-dark-400">Free Cores</p>
          <p className="text-2xl font-bold text-success-500 mt-1">{stats.free_cores}</p>
        </div>
        <div className="card bg-primary-500/5 border-primary-500/20">
          <p className="text-sm text-dark-400">Used Cores</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">{stats.used_cores}</p>
        </div>
        <div className="card bg-danger-500/5 border-danger-500/20">
          <p className="text-sm text-dark-400">Faulty Cores</p>
          <p className="text-2xl font-bold text-danger-500 mt-1">{stats.faulty_cores}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={clsx('card', selectedRoute ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <DataTable data={routes} columns={columns} searchPlaceholder="Search routes..." onRowClick={(row) => handleRouteSelect(row)} />
        </div>

        {selectedRoute && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-white">{selectedRoute.name}</h3>
                <p className="text-sm text-dark-400">{selectedRoute.fibre_type}-core fibre</p>
              </div>
              <button onClick={() => setSelectedRoute(null)} className="p-1 rounded text-dark-400 hover:bg-dark-800 hover:text-white">
                x
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {cores.map((core) => (
                <div key={core.id} className="flex items-center justify-between p-2 rounded-lg bg-dark-800/50 hover:bg-dark-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-dark-600" style={{ backgroundColor: getCoreColorStyle(core.color) }} />
                    <div>
                      <p className="text-sm text-white">Core {core.core_number}</p>
                      <p className="text-xs text-dark-400">{core.color}</p>
                    </div>
                  </div>
                  {getCoreStatusBadge(core.status)}
                </div>
              ))}
              {cores.length === 0 && <p className="text-dark-400 text-sm">No cores found for this route.</p>}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Fibre Route" size="lg">
        <form onSubmit={submitCreateRoute} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Route ID *</label>
            <input className="input" value={formData.route_id} onChange={(e) => setFormData((s) => ({ ...s, route_id: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Route Name *</label>
            <input className="input" value={formData.name} onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Start MST *</label>
            <select className="input" value={formData.start_mst_id} onChange={(e) => setFormData((s) => ({ ...s, start_mst_id: e.target.value }))} required>
              <option value="">Select Start MST</option>
              {mstBoxes.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.mst_id} - {mst.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">End MST (optional)</label>
            <select
              className="input"
              value={formData.end_mst_id}
              onChange={(e) => setFormData((s) => ({ ...s, end_mst_id: e.target.value, end_client_id: '' }))}
            >
              <option value="">None</option>
              {mstBoxes.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.mst_id} - {mst.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">End Client (optional)</label>
            <select
              className="input"
              value={formData.end_client_id}
              onChange={(e) => setFormData((s) => ({ ...s, end_client_id: e.target.value, end_mst_id: '' }))}
            >
              <option value="">None</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_id} - {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fibre Type (cores)</label>
            <select className="input" value={formData.fibre_type} onChange={(e) => setFormData((s) => ({ ...s, fibre_type: e.target.value }))}>
              {[1, 2, 4, 8, 12, 24, 48].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Installation Type</label>
            <select
              className="input"
              value={formData.installation_type}
              onChange={(e) => setFormData((s) => ({ ...s, installation_type: e.target.value }))}
            >
              <option value="underground">Underground</option>
              <option value="aerial">Aerial</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Route
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
