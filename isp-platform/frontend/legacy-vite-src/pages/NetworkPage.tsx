import { FormEvent, useEffect, useState } from 'react';
import { Plus, RefreshCcw, Router, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { networkAPI } from '../services/api';
import type { NetworkDevice } from '../types';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';

const initialForm = {
  device_id: '',
  name: '',
  device_type: 'router',
  vendor: '',
  ip_address: '',
  location_name: '',
  status: 'online',
};

export default function NetworkPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await networkAPI.getDevices({ limit: 500 });
      setDevices(data);
    } catch (error) {
      console.error('Failed to load devices', error);
      toast.error('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.device_id || !formData.name || !formData.ip_address) {
      toast.error('Device ID, name, and IP are required');
      return;
    }
    try {
      setSubmitting(true);
      await networkAPI.createDevice(formData);
      toast.success('Network device created');
      setShowCreateModal(false);
      setFormData(initialForm);
      await loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create device');
    } finally {
      setSubmitting(false);
    }
  };

  const rebootDevice = async (device: NetworkDevice) => {
    try {
      await networkAPI.rebootDevice(device.id);
      toast.success(`Reboot command sent to ${device.name}`);
      await loadDevices();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to reboot device');
    }
  };

  const monitorTraffic = async (device: NetworkDevice) => {
    try {
      const traffic = await networkAPI.getTraffic(device.id);
      toast.success(
        `${device.name}: ${traffic.uplink_mbps} Mbps up / ${traffic.downlink_mbps} Mbps down`
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to fetch traffic');
    }
  };

  const statusBadge = (status: string) => {
    const style = {
      online: 'bg-success-500/20 text-success-500',
      degraded: 'bg-warning-500/20 text-warning-500',
      offline: 'bg-danger-500/20 text-danger-500',
    }[status] || 'bg-dark-700 text-dark-300';

    return <span className={clsx('badge', style)}>{status}</span>;
  };

  const columns: ColumnDef<NetworkDevice>[] = [
    {
      accessorKey: 'device_id',
      header: 'Device ID',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.device_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'device_type',
      header: 'Type',
      cell: ({ row }) => <span className="capitalize text-dark-200">{row.original.device_type}</span>,
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
      cell: ({ row }) => <span className="font-mono text-dark-300">{row.original.ip_address}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'traffic',
      header: 'Traffic',
      cell: ({ row }) => `${row.original.uplink_mbps}/${row.original.downlink_mbps} Mbps`,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              monitorTraffic(row.original);
            }}
            className="px-2 py-1 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-200"
          >
            Monitor
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              rebootDevice(row.original);
            }}
            className="px-2 py-1 text-xs rounded bg-warning-500/20 hover:bg-warning-500/30 text-warning-400"
          >
            Reboot
          </button>
        </div>
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
          <h1 className="text-2xl font-bold text-white">Network Devices</h1>
          <p className="text-dark-400 mt-1">Routers, OLTs, and switches with monitoring actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<RefreshCcw className="w-4 h-4" />} onClick={loadDevices}>
            Refresh
          </Button>
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
            Add Device
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-dark-300">
            <Server className="w-4 h-4" />
            <span>Total Devices</span>
          </div>
          <p className="text-2xl font-bold text-white mt-2">{devices.length}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-dark-300">
            <Router className="w-4 h-4" />
            <span>Offline</span>
          </div>
          <p className="text-2xl font-bold text-danger-500 mt-2">
            {devices.filter((d) => d.status === 'offline').length}
          </p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Degraded Devices</p>
          <p className="text-2xl font-bold text-warning-500 mt-2">
            {devices.filter((d) => d.status === 'degraded').length}
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable data={devices} columns={columns} searchPlaceholder="Search devices..." />
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Network Device" size="lg">
        <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Device ID *</label>
            <input
              className="input"
              value={formData.device_id}
              onChange={(e) => setFormData((s) => ({ ...s, device_id: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={formData.name}
              onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Device Type</label>
            <select
              className="input"
              value={formData.device_type}
              onChange={(e) => setFormData((s) => ({ ...s, device_type: e.target.value }))}
            >
              <option value="router">Router</option>
              <option value="olt">OLT</option>
              <option value="switch">Switch</option>
            </select>
          </div>
          <div>
            <label className="label">Vendor</label>
            <input
              className="input"
              value={formData.vendor}
              onChange={(e) => setFormData((s) => ({ ...s, vendor: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">IP Address *</label>
            <input
              className="input"
              value={formData.ip_address}
              onChange={(e) => setFormData((s) => ({ ...s, ip_address: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input"
              value={formData.location_name}
              onChange={(e) => setFormData((s) => ({ ...s, location_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="online">Online</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Device
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
