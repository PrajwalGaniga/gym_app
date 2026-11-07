'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './card_modal.module.css';
import { api } from '@/lib/api';
import { Member, Payment, Plan } from '@/lib/types';
import { formatDate, getStatusBadgeDetails } from '@/lib/formatters';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface MemberCardDetailModalProps {
  member: Member | null;
  onClose: () => void;
  onRenewed?: () => void;
}

export const MemberCardDetailModal: React.FC<MemberCardDetailModalProps> = ({
  member,
  onClose,
  onRenewed,
}) => {
  const [currentMember, setCurrentMember] = useState<Member | null>(member);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [showRenewalForm, setShowRenewalForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [renewMethod, setRenewMethod] = useState<'Cash' | 'UPI' | 'Card'>('Cash');
  const [renewalMessage, setRenewalMessage] = useState('');

  useEffect(() => {
    setCurrentMember(member);
    if (member) {
      setIsLoadingPayments(true);
      setShowRenewalForm(false);
      setRenewalMessage('');

      Promise.all([
        api.getMemberPayments(member.id, 1, 20),
        api.getPlans(),
      ])
        .then(([paymentRes, planList]) => {
          setPayments(paymentRes.items || []);
          setPlans(planList || []);
          if (planList.length > 0) {
            setSelectedPlanId(planList[0].id);
          }
        })
        .catch((err) => console.error('Failed to load member card details:', err))
        .finally(() => setIsLoadingPayments(false));
    }
  }, [member]);

  if (!currentMember) return null;

  const displayMember = currentMember;
  const badge = getStatusBadgeDetails(displayMember.status);
  const avatarUrl = displayMember.photo?.thumbnail_url || displayMember.photo?.url;
  const initials = displayMember.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleQuickRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId || !displayMember) return;

    try {
      setIsRenewing(true);
      setRenewalMessage('');

      const plan = plans.find((p) => p.id === selectedPlanId);
      const amount = plan ? plan.price : 500;

      await api.renewMembership(displayMember.id, {
        plan_id: selectedPlanId,
        payment_amount: amount,
        payment_method: renewMethod,
        payment_date: new Date().toISOString().split('T')[0],
      });

      setRenewalMessage('✅ Membership successfully renewed!');
      setShowRenewalForm(false);
      
      // Refresh member and payments in real-time
      const [updatedMember, updatedPayments] = await Promise.all([
        api.getMemberDetail(displayMember.id),
        api.getMemberPayments(displayMember.id, 1, 20),
      ]);
      setCurrentMember(updatedMember);
      setPayments(updatedPayments.items || []);

      if (onRenewed) {
        onRenewed();
      }
    } catch (err: any) {
      alert(err.message || 'Renewal failed.');
    } finally {
      setIsRenewing(false);
    }
  };
      setIsRenewing(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.memberHeaderLeft}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayMember.full_name} className={styles.headerPhoto} />
            ) : (
              <div className={styles.headerPhotoPlaceholder}>{initials}</div>
            )}
            <div>
              <h2 className={styles.memberName}>{displayMember.full_name}</h2>
              <div className={styles.memberBadges}>
                <span className={styles.codeBadge}>{displayMember.member_code}</span>
                {displayMember.gender && <span className={styles.genderBadge}>{displayMember.gender}</span>}
                <Badge variant={badge.variant as any}>{badge.label}</Badge>
              </div>
              <a href={`tel:${displayMember.phone}`} className={styles.phoneLink}>
                📞 {displayMember.phone}
              </a>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {renewalMessage && (
            <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '0.875rem' }}>
              {renewalMessage}
            </div>
          )}

          {/* 4 Key Metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Joining Date</span>
              <span className={styles.metricValue}>
                {displayMember.joining_date_known && displayMember.joining_date
                  ? formatDate(displayMember.joining_date)
                  : 'Legacy (Unknown)'}
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Last Paid Date</span>
              <span className={styles.metricValue}>
                {displayMember.last_payment_date ? formatDate(displayMember.last_payment_date) : 'None recorded'}
              </span>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.metricLabel}>Months Completed</span>
              <span className={styles.metricValue}>
                {displayMember.total_months_completed ?? 0} {displayMember.total_months_completed === 1 ? 'Month' : 'Months'}
              </span>
            </div>

            <div className={`${styles.metricCard} ${styles.metricCardRevenue}`}>
              <span className={styles.metricLabel} style={{ color: '#065f46' }}>Total Revenue</span>
              <span className={`${styles.metricValue} ${styles.metricValueRevenue}`}>
                ₹{(displayMember.lifetime_revenue || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Current Plan Status */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>
              <span>🏋️ Current Membership</span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                {displayMember.remaining_days > 0
                  ? `🟢 ${displayMember.remaining_days} days left`
                  : displayMember.remaining_days === 0
                  ? '🟡 Expires Today'
                  : `🔴 Expired ${Math.abs(displayMember.remaining_days)}d ago`}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569' }}>
              <div>
                <strong>Plan:</strong> {displayMember.current_membership?.plan_name || 'No Active Plan'}
              </div>
              <div>
                <strong>Valid Till:</strong>{' '}
                {displayMember.current_membership?.expiry_date
                  ? formatDate(displayMember.current_membership.expiry_date)
                  : '—'}
              </div>
            </div>
          </div>

          {/* Quick Renewal Section */}
          {showRenewalForm ? (
            <div style={{ background: '#f8fafc', border: '1.5px solid #2563eb', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '12px', fontSize: '0.9375rem' }}>
                ⚡ Quick Membership Renewal
              </div>
              <form onSubmit={handleQuickRenew} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Select Plan
                    </label>
                    <select
                      value={selectedPlanId}
                      onChange={(e) => setSelectedPlanId(e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ₹{p.price} ({p.duration_value} {p.duration_unit}s)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Payment Method
                    </label>
                    <select
                      value={renewMethod}
                      onChange={(e) => setRenewMethod(e.target.value as any)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Card">Card</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                  <Button variant="secondary" size="sm" type="button" onClick={() => setShowRenewalForm(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" isLoading={isRenewing}>
                    Confirm Renewal
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowRenewalForm(true)}
              >
                ⚡ Quick Renew Membership
              </Button>
            </div>
          )}

          {/* Payment History */}
          <div className={styles.sectionBox}>
            <div className={styles.sectionTitle}>
              <span>💳 Member Payment History</span>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {payments.length} receipt{payments.length === 1 ? '' : 's'}
              </span>
            </div>

            {isLoadingPayments ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#64748b', fontSize: '0.8125rem' }}>
                Loading payment records...
              </div>
            ) : payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#94a3b8', fontSize: '0.8125rem' }}>
                No payment history on file for this member.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td>{formatDate(p.payment_date)}</td>
                        <td style={{ fontWeight: 700 }}>₹{p.amount.toLocaleString()}</td>
                        <td>{p.payment_method}</td>
                        <td style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {p.record_origin === 'legacy' ? 'Legacy' : 'Regular'}
                        </td>
                        <td>
                          <span className={p.status === 'completed' ? styles.statusPaid : styles.statusVoided}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <Link href={`/members/${displayMember.id}`}>
            <Button variant="secondary" size="sm">
              View Full Profile Page →
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
