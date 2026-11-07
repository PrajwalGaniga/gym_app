'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';
import { api } from '@/lib/api';
import { DashboardSummary } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadgeDetails } from '@/lib/formatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError('');
      const summary = await api.getDashboardSummary();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <p>Loading real-time gym analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon="⚠️"
        title="Failed to Load Dashboard"
        description={error || 'Unable to retrieve gym metrics.'}
        action={
          <Button variant="primary" onClick={fetchSummary}>
            Retry
          </Button>
        }
      />
    );
  }

  // Find max revenue for chart scaling
  const maxRevenue = Math.max(...data.revenue_chart.map((pt) => pt.amount), 1);

  return (
    <div className={styles.dashboardWrapper}>
      {/* Page Header & Quick Actions */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gym Overview</h1>
          <p className={styles.pageSubtitle}>Real-time membership health, revenue, and daily operations.</p>
        </div>

        <div className={styles.headerActions}>
          <Link href="/wallet">
            <Button variant="secondary" size="md">
              💰 Gym Wallet
            </Button>
          </Link>
          <Link href="/members/legacy">
            <Button variant="secondary" size="md">
              ➕ Add Existing Member
            </Button>
          </Link>
          <Link href="/members/new">
            <Button variant="primary" size="md">
              ➕ Register New Member
            </Button>
          </Link>
        </div>
      </div>

      {/* Expired Member Check-in Alert */}
      {data.expired_checkins_today.length > 0 && (
        <div className={styles.alertBanner}>
          <div className={styles.alertContent}>
            <span style={{ fontSize: '1.5rem' }}>🚨</span>
            <div>
              <div className={styles.alertTitle}>
                {data.expired_checkins_today.length} Expired Member{data.expired_checkins_today.length > 1 ? 's' : ''} Checked In Today!
              </div>
              <div className={styles.alertText}>
                {data.expired_checkins_today.map((item) => `${item.full_name} (${item.member_code}) at ${item.check_in_time}`).join(', ')}
              </div>
            </div>
          </div>
          <Link href="/attendance">
            <Button variant="danger" size="sm">
              Review Attendance
            </Button>
          </Link>
        </div>
      )}

      {/* Metrics Cards Grid */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Total Members</span>
            <span className={styles.metricIcon}>👥</span>
          </div>
          <div className={styles.metricValue}>{data.total_members}</div>
          <div className={styles.metricFootnote}>Active registered profiles</div>
        </div>

        <Link href="/paid" style={{ textDecoration: 'none' }}>
          <div className={`${styles.metricCard} ${styles.metricPaid}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Paid Members</span>
              <span className={styles.metricIcon}>🟢</span>
            </div>
            <div className={styles.metricValue} style={{ color: '#16a34a' }}>
              {data.paid_members}
            </div>
            <div className={styles.metricFootnote}>&gt; 3 days validity remaining</div>
          </div>
        </Link>

        <Link href="/expiring-soon" style={{ textDecoration: 'none' }}>
          <div className={`${styles.metricCard} ${styles.metricExpiring}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Expiring Soon</span>
              <span className={styles.metricIcon}>🟡</span>
            </div>
            <div className={styles.metricValue} style={{ color: '#d97706' }}>
              {data.expiring_soon_members}
            </div>
            <div className={styles.metricFootnote}>0 to 3 days (inclusive)</div>
          </div>
        </Link>

        <Link href="/expired" style={{ textDecoration: 'none' }}>
          <div className={`${styles.metricCard} ${styles.metricExpired}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Expired</span>
              <span className={styles.metricIcon}>🔴</span>
            </div>
            <div className={styles.metricValue} style={{ color: '#dc2626' }}>
              {data.expired_members}
            </div>
            <div className={styles.metricFootnote}>Validity ended in local timezone</div>
          </div>
        </Link>

        <Link href="/wallet" style={{ textDecoration: 'none' }}>
          <div className={`${styles.metricCard} ${styles.metricRevenue}`}>
            <div className={styles.metricHeader}>
              <span className={styles.metricLabel}>Month Collections</span>
              <span className={styles.metricIcon}>💰</span>
            </div>
            <div className={styles.metricValue} style={{ color: '#2563eb' }}>
              {formatCurrency(data.collections_this_month)}
            </div>
            <div className={styles.metricFootnote}>{data.new_registrations_this_month} new joins this month</div>
          </div>
        </Link>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Today Attendance</span>
            <span className={styles.metricIcon}>⏱️</span>
          </div>
          <div className={styles.metricValue}>{data.today_attendance_count}</div>
          <div className={styles.metricFootnote}>Member check-ins recorded</div>
        </div>
      </div>

      {/* Two Column Grid: Upcoming Renewals & Revenue / Recent Payments */}
      <div className={styles.dashboardSplit}>
        {/* Left: Upcoming Renewals */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Upcoming Renewals (Nearest Expiry First)</h2>
            <Link href="/expiring-soon" className={styles.viewAllLink}>
              View All Expiring →
            </Link>
          </div>

          <div className={styles.tableContainer}>
            {data.upcoming_renewals.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                No memberships expiring in the next few days.
              </div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Expiry Date</th>
                    <th>Remaining</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcoming_renewals.map((item) => (
                    <tr key={item.member_id}>
                      <td>
                        <div className={styles.memberCell}>
                          <Avatar src={item.photo_url} name={item.full_name} size="sm" />
                          <div>
                            <div className={styles.memberName}>{item.full_name}</div>
                            <div className={styles.memberSub}>ID: {item.member_code}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.plan_name}</td>
                      <td>{formatDate(item.expiry_date)}</td>
                      <td>
                        <Badge variant="warning">
                          {item.remaining_days === 0 ? 'Today' : `${item.remaining_days}d left`}
                        </Badge>
                      </td>
                      <td>
                        <Link href={`/members/${item.member_id}`}>
                          <Button variant="secondary" size="sm">
                            Renew
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: Revenue Chart & Quick Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Revenue Chart */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Monthly Collections (INR)</h2>
              <Link href="/reports" className={styles.viewAllLink}>
                Reports →
              </Link>
            </div>

            <div className={styles.chartContainer}>
              {data.revenue_chart.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No payment collections recorded yet.
                </div>
              ) : (
                <div className={styles.chartBars}>
                  {data.revenue_chart.map((point) => {
                    const heightPercent = Math.max(Math.round((point.amount / maxRevenue) * 100), 4);
                    return (
                      <div key={point.month} className={styles.chartCol}>
                        <span className={styles.chartAmount}>{formatCurrency(point.amount)}</span>
                        <div className={styles.chartBarWrapper}>
                          <div className={styles.chartBarFill} style={{ height: `${heightPercent}%` }} />
                        </div>
                        <span className={styles.chartLabel}>{point.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments Feed */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Payments</h2>
              <Link href="/payments" className={styles.viewAllLink}>
                All Payments →
              </Link>
            </div>

            <div className={styles.tableContainer}>
              {data.recent_payments.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                  No payments collected yet.
                </div>
              ) : (
                <table className={styles.table}>
                  <tbody>
                    {data.recent_payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <div className={styles.memberName}>{payment.member_name_snapshot}</div>
                          <div className={styles.memberSub}>{formatDate(payment.payment_date)} • {payment.payment_method}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          +{formatCurrency(payment.amount, payment.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

