import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Wifi, WifiOff } from 'lucide-react';
import { clientsAPI, mstAPI } from '../services/api';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import type { Client, ClientStatus, MSTBox } from '../types';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const initialForm = {
  client_id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  latitude: '',
  longitude: '',
  assigned_plan: '',
  pppoe_username: '',
  vlan_id: '',
  mst_id: '',
  splitter_port: '',
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [clients, setClients] = useState<Client[]>([]);
  const [mstBoxes, setMstBoxes] = useState<MSTBox[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const mstId = search.get('mst');
    loadClientsAndMsts(mstId ? Number(mstId) : undefined);
  }, [location.search]);

  const loadClientsAndMsts = async (mstId?: number) => {
    try {
      setLoading(true);
      const [clientData, mstData] = await Promise.all([
        clientsAPI.getAll({ limit: 500, mst_id: mstId }),
        mstAPI.getAll({ limit: 500 }),
      ]);
      setClients(clientData);
      setMstBoxes(mstData);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOnMap = (client: Client) => {
    navigate('/map', { state: { clientId: client.id } });
  };

  const toggleClientStatus = async (client: Client) => {
    const nextStatus = client.status === 'active' ? 'suspended' : 'active';
    try {
      await clientsAPI.update(client.id, { status: nextStatus });
      toast.success(`Client ${client.client_id} is now ${nextStatus}`);
      await loadClientsAndMsts();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to update client status');
    }
  };

  const getStatusBadge = (status: ClientStatus) => {
    const styles = {
      active: 'bg-success-500/20 text-success-500',
      suspended: 'bg-warning-500/20 text-warning-500',
      pending: 'bg-info-500/20 text-info-500',
      disconnected: 'bg-danger-500/20 text-danger-500',
    };
    return <span className={clsx('badge', styles[status])}>{status}</span>;
  };

  const submitCreateClient = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.client_id || !formData.name || !formData.latitude || !formData.longitude) {
      toast.error('Fill required fields: Client ID, Name, Latitude, Longitude');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        client_id: formData.client_id.trim(),
        name: formData.name.trim(),
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        assigned_plan: formData.assigned_plan || undefined,
        pppoe_username: formData.pppoe_username || undefined,
        vlan_id: formData.vlan_id ? Number(formData.vlan_id) : undefined,
        mst_id: formData.mst_id ? Number(formData.mst_id) : undefined,
        splitter_port: formData.splitter_port ? Number(formData.splitter_port) : undefined,
      };

      await clientsAPI.create(payload);
      toast.success('Client created successfully');
      setShowCreateModal(false);
      setFormData(initialForm);
      await loadClientsAndMsts();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to create client';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'client_id',
      header: 'Client ID',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.client_id}</span>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'is_online',
      header: 'Connection',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.is_online ? (
            <>
              <Wifi className="w-4 h-4 text-success-500" />
              <span className="text-success-500">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-dark-400" />
              <span className="text-dark-400">Offline</span>
            </>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'pppoe_username',
      header: 'PPPoE Username',
      cell: ({ row }) => <span className="font-mono text-dark-300">{row.original.pppoe_username || '-'}</span>,
    },
    {
      accessorKey: 'assigned_plan',
      header: 'Plan',
      cell: ({ row }) => row.original.assigned_plan || '-',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/clients/${row.original.id}`);
            }}
            className="px-2 py-1 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-200"
            title="View Details"
          >
            Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewOnMap(row.original);
            }}
            className="p-1.5 rounded-lg text-dark-400 hover:bg-dark-700 hover:text-white transition-colors"
            title="View on Map"
          >
            <MapPin className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleClientStatus(row.original);
            }}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              row.original.status === 'active'
                ? 'bg-warning-500/20 hover:bg-warning-500/30 text-warning-500'
                : 'bg-success-500/20 hover:bg-success-500/30 text-success-500'
            )}
            title={row.original.status === 'active' ? 'Suspend' : 'Activate'}
          >
            {row.original.status === 'active' ? 'Suspend' : 'Activate'}
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
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-dark-400 mt-1">Manage customer accounts and services</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          Add Client
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Total Clients</p>
          <p className="text-2xl font-bold text-white mt-1">{clients.length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Active</p>
          <p className="text-2xl font-bold text-success-500 mt-1">{clients.filter((c) => c.status === 'active').length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Suspended</p>
          <p className="text-2xl font-bold text-warning-500 mt-1">{clients.filter((c) => c.status === 'suspended').length}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Online Now</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">{clients.filter((c) => c.is_online).length}</p>
        </div>
      </div>

      <div className="card">
        <DataTable data={clients} columns={columns} searchPlaceholder="Search clients..." onRowClick={(row) => handleViewOnMap(row)} />
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Client" size="lg">
        <form onSubmit={submitCreateClient} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Client ID *</label>
            <input
              className="input"
              value={formData.client_id}
              onChange={(e) => setFormData((s) => ({ ...s, client_id: e.target.value }))}
              placeholder="CLI-1001"
              required
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={formData.name}
              onChange={(e) => setFormData((s) => ({ ...s, name: e.target.value }))}
              placeholder="Customer name"
              required
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={formData.phone} onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={formData.email} onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))} />
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
          <div>
            <label className="label">Service Plan</label>
            <input
              className="input"
              value={formData.assigned_plan}
              onChange={(e) => setFormData((s) => ({ ...s, assigned_plan: e.target.value }))}
              placeholder="Business 200Mbps"
            />
          </div>
          <div>
            <label className="label">PPPoE Username</label>
            <input
              className="input"
              value={formData.pppoe_username}
              onChange={(e) => setFormData((s) => ({ ...s, pppoe_username: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">VLAN ID</label>
            <input
              className="input"
              type="number"
              value={formData.vlan_id}
              onChange={(e) => setFormData((s) => ({ ...s, vlan_id: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">MST (optional)</label>
            <select className="input" value={formData.mst_id} onChange={(e) => setFormData((s) => ({ ...s, mst_id: e.target.value }))}>
              <option value="">Not connected yet</option>
              {mstBoxes.map((mst) => (
                <option key={mst.id} value={mst.id}>
                  {mst.mst_id} - {mst.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Splitter Port</label>
            <input
              className="input"
              type="number"
              min={1}
              value={formData.splitter_port}
              onChange={(e) => setFormData((s) => ({ ...s, splitter_port: e.target.value }))}
              placeholder="1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={formData.address} onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
