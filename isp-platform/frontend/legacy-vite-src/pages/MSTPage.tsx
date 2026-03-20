import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, AlertTriangle } from 'lucide-react';
import { mstAPI } from '../services/api';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import type { MSTBox, SplitterType } from '../types';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const initialForm = {
  mst_id: '',
  name: '',
  location_name: '',
  latitude: '',
  longitude: '',
  splitter_type: '1/8' as SplitterType,
};

export default function MSTPage() {
  const navigate = useNavigate();
  const [mstBoxes, setMstBoxes] = useState<MSTBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    nearly_full: 0,
    full: 0,
  });
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mstData, statsData] = await Promise.all([mstAPI.getAll({ limit: 500 }), mstAPI.getStats()]);
      setMstBoxes(mstData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load MST data:', error);
      toast.error('Failed to load MST boxes');
    } finally {
      setLoading(false);
    }
  };

  const getCapacityBadge = (status: string) => {
    const styles = {
      available: 'bg-success-500/20 text-success-500',
      nearly_full: 'bg-warning-500/20 text-warning-500',
      full: 'bg-danger-500/20 text-danger-500',
    };
    return <span className={clsx('badge', styles[status as keyof typeof styles] || 'bg-dark-700 text-dark-300')}>{status}</span>;
  };

  const submitCreateMst = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.mst_id || !formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Fill required fields: MST ID, Name, Latitude, Longitude');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        mst_id: formData.mst_id.trim(),
        name: formData.name.trim(),
        location_name: formData.location_name || undefined,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        splitter_type: formData.splitter_type,
      };
      await mstAPI.create(payload);
      toast.success('MST box created');
      setFormData(initialForm);
      setShowCreateModal(false);
      await loadData();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to create MST box';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<MSTBox>[] = [
    {
      accessorKey: 'mst_id',
      header: 'MST ID',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.mst_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'location_name',
      header: 'Location',
      cell: ({ row }) => row.original.location_name || '-',
    },
    {
      accessorKey: 'splitter_type',
      header: 'Splitter',
      cell: ({ row }) => <span className="badge bg-dark-700 text-dark-200">{row.original.splitter_type}</span>,
    },
    {
      accessorKey: 'ports',
      header: 'Ports Used',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full transition-all',
                row.original.capacity_status === 'full'
                  ? 'bg-danger-500'
                  : row.original.capacity_status === 'nearly_full'
                  ? 'bg-warning-500'
                  : 'bg-success-500'
              )}
              style={{ width: `${(row.original.used_ports / Math.max(row.original.total_ports, 1)) * 100}%` }}
            />
          </div>
          <span className="text-sm text-dark-300">
            {row.original.used_ports}/{row.original.total_ports}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'capacity_status',
      header: 'Capacity',
      cell: ({ row }) => getCapacityBadge(row.original.capacity_status),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate('/map', { state: { mstId: row.original.id } });
          }}
          className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-white transition-colors"
          title="View on Map"
        >
          <MapPin className="w-4 h-4" />
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
          <h1 className="text-2xl font-bold text-white">MST Boxes</h1>
          <p className="text-dark-400 mt-1">Manage network distribution points</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          Add MST Box
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Total MST Boxes</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
        </div>
        <div className="card bg-success-500/5 border-success-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success-500" />
            <p className="text-sm text-dark-400">Available</p>
          </div>
          <p className="text-2xl font-bold text-success-500 mt-1">{stats.available}</p>
        </div>
        <div className="card bg-warning-500/5 border-warning-500/20">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning-500" />
            <p className="text-sm text-dark-400">Nearly Full</p>
          </div>
          <p className="text-2xl font-bold text-warning-500 mt-1">{stats.nearly_full}</p>
        </div>
        <div className="card bg-danger-500/5 border-danger-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger-500" />
            <p className="text-sm text-dark-400">Full</p>
          </div>
          <p className="text-2xl font-bold text-danger-500 mt-1">{stats.full}</p>
        </div>
      </div>

      <div className="card">
        <DataTable data={mstBoxes} columns={columns} searchPlaceholder="Search MST boxes..." onRowClick={(row) => navigate('/map', { state: { mstId: row.id } })} />
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New MST Box" size="lg">
        <form onSubmit={submitCreateMst} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">MST ID *</label>
            <input
              className="input"
              value={formData.mst_id}
              onChange={(e) => setFormData((s) => ({ ...s, mst_id: e.target.value }))}
              placeholder="MST-1001"
              required
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={formData.name}
              onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
              placeholder="Ikeja Central MST"
              required
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input"
              value={formData.location_name}
              onChange={(e) => setFormData((s) => ({ ...s, location_name: e.target.value }))}
              placeholder="Area/Street"
            />
          </div>
          <div>
            <label className="label">Splitter Type</label>
            <select
              className="input"
              value={formData.splitter_type}
              onChange={(e) => setFormData((s) => ({ ...s, splitter_type: e.target.value as SplitterType }))}
            >
              <option value="1/2">1/2</option>
              <option value="1/4">1/4</option>
              <option value="1/8">1/8</option>
              <option value="1/16">1/16</option>
              <option value="1/32">1/32</option>
              <option value="1/64">1/64</option>
            </select>
          </div>
          <div>
            <label className="label">Latitude *</label>
            <input
              className="input"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={(e) => setFormData((s) => ({ ...s, latitude: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Longitude *</label>
            <input
              className="input"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={(e) => setFormData((s) => ({ ...s, longitude: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create MST Box
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
