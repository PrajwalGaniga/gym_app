'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Button } from '@/components/ui/Button';

export default function ReportsPage() {
  const todayStr = new Date().toISOString().split('T')[0];
  const thirtyDaysAgoStr = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [collectionsData, setCollectionsData] = useState<any>(null);
  const [membersData, setMembersData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const [col, mem, att] = await Promise.all([
        api.getCollectionsReport(startDate, endDate),
        api.getMembersReport(startDate, endDate),
        api.getAttendanceReport(startDate, endDate),
      ]);
      setCollectionsData(col);
      setMembersData(mem);
      setAttendanceData(att);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const handleExportAttendance = async () => {
    try {
      const csvStr = await api.exportAttendanceCsv(startDate, endDate);
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export attendance CSV.');
    }
  };

  const handleExportPayments = async () => {
    try {
      const csvStr = await api.exportPaymentsCsv({ start_date: startDate, end_date: endDate });
      const blob = new Blob([csvStr], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collections_${startDate}_to_${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export payments CSV.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reports & Analytics</h1>
          <p className={styles.subtitle}>Financial performance, membership growth, and gym attendance summaries.</p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleExportPayments}>
            📥 Export Collections CSV
          </Button>
          <Button variant="secondary" onClick={handleExportAttendance}>
            📥 Export Attendance CSV
          </Button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Select Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
          <span style={{ color: '#64748b' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate(todayStr);
              setEndDate(todayStr);
            }}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 7);
              setStartDate(d.toISOString().split('T')[0]);
              setEndDate(todayStr);
            }}
          >
            Last 7 Days
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate(thirtyDaysAgoStr);
              setEndDate(todayStr);
            }}
          >
            Last 30 Days
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Generating reports...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Revenue & Collections Breakdown */}
          {collectionsData && (
            <div className={styles.card} style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Fee Collections Summary</h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Gross Collected</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginTop: '4px' }}>
                    {formatCurrency(collectionsData.gross_collected)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    {collectionsData.total_transactions} completed payments
                  </div>
                </div>

                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Voided / Reversed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: '4px' }}>
                    {formatCurrency(collectionsData.voided_amount)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Excluded from revenue</div>
                </div>

                <div style={{ padding: '16px', background: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', textTransform: 'uppercase' }}>Net Collected Revenue</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                    {formatCurrency(collectionsData.net_collected)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#1e40af', marginTop: '2px' }}>Actual revenue received</div>
                </div>
              </div>

              {/* Payment Method Breakdown */}
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '12px' }}>By Payment Method</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th>Transactions</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {collectionsData.by_payment_method.map((item: any) => (
                    <tr key={item.method}>
                      <td>
                        <strong>{item.method}</strong>
                      </td>
                      <td>{item.count}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Members & Attendance Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Membership Growth */}
            {membersData && (
              <div className={styles.card} style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Membership Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>New Member Registrations:</span>
                    <strong>{membersData.new_registrations}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Renewals Recorded:</span>
                    <strong>{membersData.renewals_count}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Current Active (Paid):</span>
                    <strong style={{ color: '#16a34a' }}>{membersData.current_paid}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Expiring Soon (0–3d):</span>
                    <strong style={{ color: '#d97706' }}>{membersData.current_expiring_soon}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span>Current Expired:</span>
                    <strong style={{ color: '#dc2626' }}>{membersData.current_expired}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Summary */}
            {attendanceData && (
              <div className={styles.card} style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Attendance Activity</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Total Check-Ins:</span>
                    <strong>{attendanceData.total_checkins}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>Distinct Members Attended:</span>
                    <strong>{attendanceData.unique_members}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                    <span>Expired Member Check-Ins:</span>
                    <strong style={{ color: attendanceData.expired_checkins_count > 0 ? '#dc2626' : '#16a34a' }}>
                      {attendanceData.expired_checkins_count}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

