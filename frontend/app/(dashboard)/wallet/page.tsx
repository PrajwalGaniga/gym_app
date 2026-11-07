'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './wallet.module.css';
import { api } from '@/lib/api';
import { WalletReportResponse } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

export default function WalletPage() {
  const [period, setPeriod] = useState<string>('30d');
  const [report, setReport] = useState<WalletReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWallet = async (selectedPeriod: string) => {
    try {
      setIsLoading(true);
      setError('');
      const data = await api.getWalletReport(selectedPeriod);
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wallet report.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet(period);
  }, [period]);

  const periods = [
    { key: '7d', label: 'Last 7 Days' },
    { key: '15d', label: 'Last 15 Days' },
    { key: '30d', label: 'Last 30 Days' },
    { key: '6m', label: 'Last 6 Months' },
    { key: '1y', label: 'Last 1 Year' },
    { key: 'all', label: 'All Time (Totally)' },
  ];

  // Maximum value for bar chart scaling
  const maxDailyAmount = report?.daily_totals?.reduce(
    (max, item) => (item.amount > max ? item.amount : max),
    0
  ) || 1;

  return (
    <div className={styles.container}>
      {/* Header & Quick Filter Pills */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <span>💰</span> Gym Wallet & Revenue Intelligence
          </h1>
          <p className={styles.subtitle}>
            Total revenue generated, fee collections, and cash flow across key time horizons.
          </p>
        </div>

        {/* Filter Pills */}
        <div className={styles.filterPills}>
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`${styles.pillBtn} ${period === p.key ? styles.pillBtnActive : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          Calculating gym wallet collections...
        </div>
      ) : error ? (
        <div style={{ padding: '24px', backgroundColor: '#fef2f2', color: '#b91c1c', borderRadius: '12px' }}>
          ⚠️ {error}
        </div>
      ) : !report ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No wallet data available.</div>
      ) : (
        <>
          {/* 4 KPI Metric Cards */}
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.kpiCardHighlight}`}>
              <span className={styles.kpiLabel} style={{ color: '#065f46' }}>
                Total Revenue Generated
              </span>
              <span className={`${styles.kpiValue} ${styles.kpiValueGreen}`}>
                ₹{report.total_revenue.toLocaleString()}
              </span>
              <span className={styles.kpiSubtext} style={{ color: '#047857' }}>
                Completed payments in selected period
              </span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Total Transactions</span>
              <span className={styles.kpiValue}>{report.total_transactions}</span>
              <span className={styles.kpiSubtext}>Completed receipts logged</span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Average Transaction Value</span>
              <span className={styles.kpiValue}>₹{report.average_ticket.toLocaleString()}</span>
              <span className={styles.kpiSubtext}>Average collection per receipt</span>
            </div>

            <div className={styles.kpiCard}>
              <span className={styles.kpiLabel}>Active Time Window</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: '6px' }}>
                {report.start_date ? formatDate(report.start_date) : 'All History'} → {formatDate(report.end_date)}
              </span>
              <span className={styles.kpiSubtext}>Filtered by: {periods.find((p) => p.key === period)?.label}</span>
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>💳 Payment Methods Breakdown</h2>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Distribution across payment channels
              </span>
            </div>

            {report.by_payment_method.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                No payment transactions recorded in this period.
              </div>
            ) : (
              <div className={styles.methodsGrid}>
                {report.by_payment_method.map((m) => {
                  const percentage =
                    report.total_revenue > 0 ? Math.round((m.amount / report.total_revenue) * 100) : 0;

                  return (
                    <div key={m.method} className={styles.methodCard}>
                      <div className={styles.methodTitle}>
                        <span>
                          {m.method === 'Cash'
                            ? '💵 Cash'
                            : m.method === 'UPI'
                            ? '📱 UPI / QR'
                            : m.method === 'Card'
                            ? '💳 Card'
                            : '🏦 Bank / Other'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {m.count} receipt{m.count === 1 ? '' : 's'} ({percentage}%)
                        </span>
                      </div>
                      <div className={styles.methodAmount}>₹{m.amount.toLocaleString()}</div>
                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{
                            width: `${percentage}%`,
                            backgroundColor:
                              m.method === 'Cash'
                                ? '#16a34a'
                                : m.method === 'UPI'
                                ? '#2563eb'
                                : '#8b5cf6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Daily / Trend Chart */}
          {report.daily_totals && report.daily_totals.length > 0 && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>📈 Collection Trend</h2>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Daily receipts within the {periods.find((p) => p.key === period)?.label}
                </span>
              </div>

              <div className={styles.chartContainer}>
                {report.daily_totals.map((item) => {
                  const heightPercent = Math.max(8, Math.round((item.amount / maxDailyAmount) * 100));
                  return (
                    <div key={item.date} className={styles.chartColumn} title={`${item.date}: ₹${item.amount.toLocaleString()}`}>
                      <div style={{ fontSize: '0.625rem', color: '#64748b' }}>₹{item.amount >= 1000 ? `${Math.round(item.amount / 1000)}k` : item.amount}</div>
                      <div className={styles.bar} style={{ height: `${heightPercent}%` }} />
                      <div className={styles.barDate}>{item.date.slice(5)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transaction Ledger */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>🧾 Transaction Ledger</h2>
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Showing up to {report.recent_transactions.length} receipts
              </span>
            </div>

            {report.recent_transactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                No completed payments in this date range.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.ledgerTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Member</th>
                      <th>Member ID</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                      <th>Notes / Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.recent_transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>{formatDate(tx.payment_date)}</td>
                        <td style={{ fontWeight: 600 }}>
                          <Link href={`/members/${tx.member_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                            {tx.member_name}
                          </Link>
                        </td>
                        <td>
                          <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {tx.member_code}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#15803d' }}>
                          ₹{tx.amount.toLocaleString()}
                        </td>
                        <td>
                          <span className={styles.methodBadge}>{tx.payment_method}</span>
                        </td>
                        <td>
                          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}>
                            {tx.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {tx.notes || tx.reference || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
