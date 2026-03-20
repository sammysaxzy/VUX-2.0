import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientsAPI, ticketsAPI } from '../services/api';
import type { Client, Ticket } from '../types';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';

const initialForm = {
  ticket_id: '',
  title: '',
  description: '',
  category: 'fault',
  priority: 'medium',
  status: 'open',
  client_id: '',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    assigned: 0,
    in_progress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ticketRows, summaryRows, clientRows] = await Promise.all([
        ticketsAPI.getAll({ limit: 500 }),
        ticketsAPI.getSummary(),
        clientsAPI.getAll({ limit: 500 }),
      ]);
      setTickets(ticketRows);
      setSummary(summaryRows);
      setClients(clientRows);
    } catch (error) {
      console.error('Failed to load tickets', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.ticket_id || !formData.title || !formData.description) {
      toast.error('Ticket ID, title, and description are required');
      return;
    }
    try {
      setSubmitting(true);
      await ticketsAPI.create({
        ...formData,
        client_id: formData.client_id ? Number(formData.client_id) : undefined,
      });
      toast.success('Ticket created');
      setShowCreateModal(false);
      setFormData(initialForm);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const assignTicket = async (ticket: Ticket) => {
    const userIdRaw = window.prompt('Assign to user ID');
    if (!userIdRaw) return;
    const userId = Number(userIdRaw);
    if (Number.isNaN(userId)) {
      toast.error('Invalid user ID');
      return;
    }
    try {
      await ticketsAPI.assign(ticket.id, userId);
      toast.success(`Ticket ${ticket.ticket_id} assigned`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to assign ticket');
    }
  };

  const resolveTicket = async (ticket: Ticket) => {
    const notes = window.prompt('Resolution notes');
    if (!notes) return;
    try {
      await ticketsAPI.resolve(ticket.id, notes);
      toast.success(`Ticket ${ticket.ticket_id} resolved`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to resolve ticket');
    }
  };

  const statusBadge = (status: string) => {
    const style = {
      open: 'bg-warning-500/20 text-warning-500',
      assigned: 'bg-info-500/20 text-info-500',
      in_progress: 'bg-primary-500/20 text-primary-400',
      resolved: 'bg-success-500/20 text-success-500',
    }[status] || 'bg-dark-700 text-dark-300';
    return <span className={clsx('badge', style)}>{status}</span>;
  };

  const priorityBadge = (priority: string) => {
    const style = {
      low: 'bg-dark-700 text-dark-300',
      medium: 'bg-info-500/20 text-info-500',
      high: 'bg-warning-500/20 text-warning-500',
      critical: 'bg-danger-500/20 text-danger-500',
    }[priority] || 'bg-dark-700 text-dark-300';
    return <span className={clsx('badge', style)}>{priority}</span>;
  };

  const clientName = (clientId?: number | null) =>
    clientId ? clients.find((client) => client.id === clientId)?.name || `Client #${clientId}` : 'General';

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: 'ticket_id',
      header: 'Ticket ID',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.ticket_id}</span>,
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      accessorKey: 'client_id',
      header: 'Client',
      cell: ({ row }) => clientName(row.original.client_id),
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => priorityBadge(row.original.priority),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          {row.original.status !== 'resolved' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  assignTicket(row.original);
                }}
                className="px-2 py-1 text-xs rounded bg-dark-700 hover:bg-dark-600 text-dark-100"
              >
                Assign
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resolveTicket(row.original);
                }}
                className="px-2 py-1 text-xs rounded bg-success-500/20 hover:bg-success-500/30 text-success-500"
              >
                Resolve
              </button>
            </>
          )}
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
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-dark-400 mt-1">Open, assign, and resolve customer issues</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          Open Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Total</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.total}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Open</p>
          <p className="text-2xl font-bold text-warning-500 mt-1">{summary.open}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Assigned</p>
          <p className="text-2xl font-bold text-info-500 mt-1">{summary.assigned}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">In Progress</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">{summary.in_progress}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Resolved</p>
          <p className="text-2xl font-bold text-success-500 mt-1">{summary.resolved}</p>
        </div>
      </div>

      <div className="card">
        <DataTable data={tickets} columns={columns} searchPlaceholder="Search tickets..." />
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Open Ticket" size="lg">
        <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Ticket ID *</label>
            <input
              className="input"
              value={formData.ticket_id}
              onChange={(e) => setFormData((s) => ({ ...s, ticket_id: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={formData.category}
              onChange={(e) => setFormData((s) => ({ ...s, category: e.target.value }))}
            >
              <option value="fault">Fault</option>
              <option value="billing">Billing</option>
              <option value="installation">Installation</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Title *</label>
            <input
              className="input"
              value={formData.title}
              onChange={(e) => setFormData((s) => ({ ...s, title: e.target.value }))}
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description *</label>
            <textarea
              className="input min-h-24"
              value={formData.description}
              onChange={(e) => setFormData((s) => ({ ...s, description: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={formData.priority}
              onChange={(e) => setFormData((s) => ({ ...s, priority: e.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="label">Client</label>
            <select
              className="input"
              value={formData.client_id}
              onChange={(e) => setFormData((s) => ({ ...s, client_id: e.target.value }))}
            >
              <option value="">General (No client)</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_id} - {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
