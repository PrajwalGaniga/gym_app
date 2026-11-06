'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Payment, PaginatedPayments } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';

export default function PaymentsPage() {
  const [data, setData] = useState<PaginatedPayments | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Void Modal
  const [voidTarget, setVoidTarget] = useState<Payment | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.getPayments({
        search: search.trim() || undefined,
        status: status || undefined,
        payment_method: paymentMethod || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: 15,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [status, paymentMethod, startDate, endDate, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const handleExportCsv = async () => {
    try {
      const csvStr = await api.exportPaymentsCsv({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: status || undefined,
      });
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export CSV.');
    }
  };

  const handleExecuteVoid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTarget || !voidReason.trim()) return;

    try {
      setIsVoiding(true);
      await api.voidPayment(voidTarget.id, voidReason.trim());
      setVoidTarget(null);
      setVoidReason('');
      fetchPayments();
    } catch (err: any) {
      alert(err.message || 'Void operation failed.');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Payment History & Transactions</h1>
          <p className={styles.subtitle}>
            Append-only financial records for membership fees, renewals, and audited reversals.
          </p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleExportCsv}>
            📥 Export to CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      {data && (
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Valid Collections (Filtered)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', marginTop: '2px' }}>
              {formatCurrency(data.total_amount_collected)}
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Showing <strong>{data.total}</strong> recorded transactions across all selected filters.
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <form onSubmit={handleSearchSubmit} className={styles.searchBox}>
          <span>🔍</span>
          <input
            type="text"
            placeholder="Search Member Code or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="ghost" size="sm">
            Search
          </Button>
        </form>

        <div className={styles.filterControls} style={{ flexWrap: 'wrap' }}>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed Only</option>
            <option value="voided">Voided Only</option>
          </select>

          <select
            value={paymentMethod}
            onChange={(e) => {
              setPaymentMethod(e.target.value);
              setPage(1);
            }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          >
            <option value="">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            title="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
            title="End Date"
          />
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.card}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading payment ledger...</div>
        ) : error ? (
          <EmptyState icon="⚠️" title="Error" description={error} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon="💰" title="No Payments Found" description="No payment records match the current criteria." />
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Origin</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.payment_date)}</td>
                    <td>
                      <Link href={`/members/${payment.member_id}`} style={{ fontWeight: 600, color: '#0f172a' }}>
                        {payment.member_name_snapshot}
                      </Link>
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', fontFamily: 'monospace' }}>
                        {payment.member_code_snapshot}
                      </div>
                    </td>
                    <td
                      style={{
                        fontWeight: 700,
                        color: payment.status === 'completed' ? '#16a34a' : '#94a3b8',
                        textDecoration: payment.status === 'voided' ? 'line-through' : 'none',
                      }}
                    >
                      {formatCurrency(payment.amount, payment.currency)}
                    </td>
                    <td>{payment.payment_method}</td>
                    <td>{payment.reference || '—'}</td>
                    <td>
                      <Badge variant="neutral">{payment.record_origin}</Badge>
                    </td>
                    <td>
                      {payment.status === 'completed' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <div>
                          <Badge variant="danger" showDot={false}>
                            Voided
                          </Badge>
                          {payment.void_reason && (
                            <div style={{ fontSize: '0.7rem', color: '#991b1b', marginTop: '2px' }}>
                              Reason: {payment.void_reason}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {payment.status === 'completed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setVoidTarget(payment);
                            setVoidReason('');
                          }}
                        >
                          Void Payment
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              page={data.page}
              totalPages={data.total_pages}
              totalItems={data.total}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* Void Confirmation Modal */}
      {voidTarget && (
        <Modal
          isOpen={true}
          onClose={() => setVoidTarget(null)}
          title={`Void Payment: ${formatCurrency(voidTarget.amount, voidTarget.currency)}`}
        >
          <form onSubmit={handleExecuteVoid}>
            <div className={styles.warningBox} style={{ marginBottom: '16px' }}>
              ⚠️ <strong>Warning:</strong> Voiding a payment is an audited action. It permanently marks this transaction as
              voided and immediately deducts the amount from revenue calculations.
            </div>

            <p style={{ fontSize: '0.875rem', marginBottom: '14px' }}>
              Member: <strong>{voidTarget.member_name_snapshot}</strong> ({voidTarget.member_code_snapshot})<br />
              Amount: <strong>{formatCurrency(voidTarget.amount, voidTarget.currency)}</strong> on{' '}
              {formatDate(voidTarget.payment_date)}
            </p>

            <Input
              label="Mandatory Reason for Voiding"
              required
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="e.g. Accidental duplicate entry, cheque dishonoured, customer cancelled"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" type="button" onClick={() => setVoidTarget(null)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" isLoading={isVoiding} disabled={!voidReason.trim()}>
                Confirm Void Transaction
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
