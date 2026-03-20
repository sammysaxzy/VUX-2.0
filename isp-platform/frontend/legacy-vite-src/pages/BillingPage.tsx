import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingAPI, clientsAPI } from '../services/api';
import type { BillingPayment, Client } from '../types';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { ColumnDef } from '@tanstack/react-table';
import clsx from 'clsx';

const initialForm = {
  payment_id: '',
  client_id: '',
  amount: '',
  currency: 'NGN',
  status: 'pending',
  payment_method: 'bank_transfer',
  invoice_reference: '',
};

export default function BillingPage() {
  const [payments, setPayments] = useState<BillingPayment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState({
    total_invoices: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    revenue_paid: 0,
    currency: 'NGN',
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
      const [paymentRows, summaryRows, clientsRows] = await Promise.all([
        billingAPI.getPayments({ limit: 500 }),
        billingAPI.getSummary(),
        clientsAPI.getAll({ limit: 500 }),
      ]);
      setPayments(paymentRows);
      setSummary(summaryRows);
      setClients(clientsRows);
    } catch (error) {
      console.error('Failed to load billing data', error);
      toast.error('Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.payment_id || !formData.client_id || !formData.amount) {
      toast.error('Payment ID, client, and amount are required');
      return;
    }
    try {
      setSubmitting(true);
      await billingAPI.createPayment({
        ...formData,
        client_id: Number(formData.client_id),
        amount: Number(formData.amount),
      });
      toast.success('Payment created');
      setShowCreateModal(false);
      setFormData(initialForm);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create payment');
    } finally {
      setSubmitting(false);
    }
  };

  const markPaid = async (payment: BillingPayment) => {
    try {
      await billingAPI.markPaid(payment.id);
      toast.success(`${payment.payment_id} marked paid`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to mark payment');
    }
  };

  const statusBadge = (status: string) => {
    const style = {
      paid: 'bg-success-500/20 text-success-500',
      pending: 'bg-warning-500/20 text-warning-500',
      overdue: 'bg-danger-500/20 text-danger-500',
    }[status] || 'bg-dark-700 text-dark-300';
    return <span className={clsx('badge', style)}>{status}</span>;
  };

  const clientName = (clientId: number) =>
    clients.find((client) => client.id === clientId)?.name || `Client #${clientId}`;

  const columns: ColumnDef<BillingPayment>[] = [
    {
      accessorKey: 'payment_id',
      header: 'Invoice',
      cell: ({ row }) => <span className="font-mono text-primary-400">{row.original.payment_id}</span>,
    },
    {
      accessorKey: 'client_id',
      header: 'Client',
      cell: ({ row }) => clientName(row.original.client_id),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span>
          {row.original.currency} {Number(row.original.amount).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => statusBadge(row.original.status),
    },
    {
      accessorKey: 'payment_method',
      header: 'Method',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status !== 'paid' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              markPaid(row.original);
            }}
            className="px-2 py-1 text-xs rounded bg-success-500/20 hover:bg-success-500/30 text-success-500"
          >
            Mark Paid
          </button>
        ) : (
          <span className="text-xs text-dark-400">Paid</span>
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
          <h1 className="text-2xl font-bold text-white">Billing</h1>
          <p className="text-dark-400 mt-1">Payments, invoices, and revenue tracking</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
          Add Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="card">
          <p className="text-sm text-dark-400">Invoices</p>
          <p className="text-2xl font-bold text-white mt-1">{summary.total_invoices}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Paid</p>
          <p className="text-2xl font-bold text-success-500 mt-1">{summary.paid}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Pending</p>
          <p className="text-2xl font-bold text-warning-500 mt-1">{summary.pending}</p>
        </div>
        <div className="card">
          <p className="text-sm text-dark-400">Overdue</p>
          <p className="text-2xl font-bold text-danger-500 mt-1">{summary.overdue}</p>
        </div>
        <div className="card bg-primary-500/5 border-primary-500/20">
          <p className="text-sm text-dark-400">Revenue</p>
          <p className="text-2xl font-bold text-primary-400 mt-1">
            {summary.currency} {Number(summary.revenue_paid).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="card">
        <DataTable data={payments} columns={columns} searchPlaceholder="Search payments..." />
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add Payment" size="lg">
        <form onSubmit={submitCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Payment ID *</label>
            <input
              className="input"
              value={formData.payment_id}
              onChange={(e) => setFormData((s) => ({ ...s, payment_id: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Client *</label>
            <select
              className="input"
              value={formData.client_id}
              onChange={(e) => setFormData((s) => ({ ...s, client_id: e.target.value }))}
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.client_id} - {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Amount *</label>
            <input
              className="input"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData((s) => ({ ...s, amount: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Currency</label>
            <input
              className="input"
              value={formData.currency}
              onChange={(e) => setFormData((s) => ({ ...s, currency: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData((s) => ({ ...s, status: e.target.value }))}
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="label">Method</label>
            <select
              className="input"
              value={formData.payment_method}
              onChange={(e) => setFormData((s) => ({ ...s, payment_method: e.target.value }))}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Invoice Reference</label>
            <input
              className="input"
              value={formData.invoice_reference}
              onChange={(e) => setFormData((s) => ({ ...s, invoice_reference: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Create Payment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
