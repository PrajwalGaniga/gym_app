'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Member, Payment, Attendance, Plan, RenewalPreview } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, getStatusBadgeDetails } from '@/lib/formatters';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const memberId = resolvedParams.id;
  const searchParams = useSearchParams();

  const [member, setMember] = useState<Member | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeTab, setActiveTab] = useState<'payments' | 'attendance'>('payments');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Renewal Modal
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(searchParams.get('action') === 'renew');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [renewalPreview, setRenewalPreview] = useState<RenewalPreview | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);

  // Manual Expiry Migration Modal
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [newMigratedExpiry, setNewMigratedExpiry] = useState('');
  const [migrationReason, setMigrationReason] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  // Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Photo replacement
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fetchMemberData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [m, pRes, aRes, plansList] = await Promise.all([
        api.getMemberDetail(memberId),
        api.getMemberPayments(memberId),
        api.getMemberAttendance(memberId),
        api.getPlans(),
      ]);
      setMember(m);
      setPayments(pRes.items);
      setAttendance(aRes.items);
      setPlans(plansList);

      if (plansList.length > 0) {
        setSelectedPlanId(plansList[0].id);
        setPaymentAmount(plansList[0].price);
      }

      setEditName(m.full_name);
      setEditPhone(m.phone);
      setEditNotes(m.notes || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load member profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberData();
  }, [memberId]);

  // Handle plan change in renewal modal to fetch preview
  useEffect(() => {
    if (isRenewModalOpen && selectedPlanId && member) {
      api
        .previewRenewal(member.id, selectedPlanId, paymentDate)
        .then((preview) => {
          setRenewalPreview(preview);
          setPaymentAmount(preview.amount);
        })
        .catch(console.error);
    }
  }, [isRenewModalOpen, selectedPlanId, paymentDate]);

  const handleExecuteRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !selectedPlanId) return;

    try {
      setIsRenewing(true);
      await api.renewMembership(member.id, {
        plan_id: selectedPlanId,
        payment_amount: paymentAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        idempotency_key: `renew_${member.id}_${Date.now()}`,
      });
      setIsRenewModalOpen(false);
      fetchMemberData();
    } catch (err: any) {
      alert(err.message || 'Renewal failed.');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleExecuteMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !newMigratedExpiry || !migrationReason.trim()) {
      alert('Please select an expiry date and provide an audit reason.');
      return;
    }

    try {
      setIsMigrating(true);
      await api.migrateExpiryDate(member.id, {
        new_expiry_date: newMigratedExpiry,
        reason: migrationReason.trim(),
      });
      setIsMigrateModalOpen(false);
      fetchMemberData();
    } catch (err: any) {
      alert(err.message || 'Migration failed.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      setIsSavingEdit(true);
      await api.updateMember(member.id, {
        full_name: editName.trim(),
        phone: editPhone.trim(),
        notes: editNotes.trim() || undefined,
      });
      setIsEditModalOpen(false);
      fetchMemberData();
    } catch (err: any) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handlePhotoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member || !photoFile) return;

    try {
      setIsUploadingPhoto(true);
      await api.uploadMemberPhoto(member.id, photoFile);
      setIsPhotoModalOpen(false);
      setPhotoFile(null);
      fetchMemberData();
    } catch (err: any) {
      alert(err.message || 'Photo upload failed.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!member || !confirm('Are you sure you want to remove this profile photograph?')) return;
    try {
      await api.removeMemberPhoto(member.id);
      fetchMemberData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove photo.');
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading member profile...</div>;
  }

  if (error || !member) {
    return <EmptyState icon="⚠️" title="Member Not Found" description={error || 'Could not locate this member.'} />;
  }

  const badge = getStatusBadgeDetails(member.status);
  const currentPlan = member.current_membership?.plan_name || 'None';

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
        <Link href="/members" style={{ color: '#2563eb' }}>
          ← Back to Members
        </Link>
      </div>

      {/* Hero Card */}
      <div className={styles.profileHero}>
        <div className={styles.heroLeft}>
          <div style={{ position: 'relative' }}>
            <Avatar src={member.photo?.thumbnail_url || member.photo?.url} name={member.full_name} size="lg" />
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '50%',
                width: '26px',
                height: '26px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                cursor: 'pointer',
              }}
              title="Change Profile Photo"
            >
              📷
            </button>
          </div>

          <div className={styles.heroDetails}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className={styles.heroName}>{member.full_name}</h1>
              <Badge variant={badge.variant as any}>{badge.label}</Badge>
              {member.is_archived && <Badge variant="neutral">Archived</Badge>}
            </div>

            <div className={styles.heroMeta}>
              <span>
                ID: <strong>{member.member_code}</strong>
              </span>
              <span>•</span>
              <a href={`tel:${member.phone}`} style={{ color: '#2563eb', fontWeight: 500 }}>
                📞 {member.phone}
              </a>
              <span>•</span>
              <span>
                Joined:{' '}
                <strong>
                  {member.joining_date_known && member.joining_date ? formatDate(member.joining_date) : 'Unknown (Legacy)'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className={styles.heroActions}>
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            ✏️ Edit Profile
          </Button>
          <Button variant="secondary" onClick={() => setIsMigrateModalOpen(true)} title="Adjust legacy expiry without payment">
            ⚙️ Migrate Expiry
          </Button>
          <Button variant="primary" size="md" onClick={() => setIsRenewModalOpen(true)}>
            🔄 Renew Membership
          </Button>
        </div>
      </div>

      {/* Current Membership Snapshot Card */}
      <div className={styles.card} style={{ padding: '20px 24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '14px' }}>Current Membership Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Current Plan</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>{currentPlan}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Period Start</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
              {formatDate(member.current_membership?.start_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Expiry Date (Inclusive)</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
              {formatDate(member.current_membership?.expiry_date)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Validity Balance</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginTop: '2px' }}>
              {member.current_membership ? (
                member.remaining_days > 0 ? (
                  <span style={{ color: '#16a34a' }}>{member.remaining_days} days left</span>
                ) : member.remaining_days === 0 ? (
                  <span style={{ color: '#d97706' }}>Expires Today</span>
                ) : (
                  <span style={{ color: '#dc2626' }}>{Math.abs(member.remaining_days)} days expired</span>
                )
              ) : (
                '—'
              )}
            </div>
          </div>
        </div>

        {member.notes && (
          <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f8fafc', borderRadius: '6px', fontSize: '0.8125rem', color: '#475569' }}>
            <strong>Notes:</strong> {member.notes}
          </div>
        )}
      </div>

      {/* Tabs for Payment and Attendance History */}
      <div className={styles.profileTabs}>
        <button
          className={`${styles.tab} ${activeTab === 'payments' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💰 Payment History ({payments.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'attendance' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          ⏱️ Attendance History ({attendance.length})
        </button>
      </div>

      {/* Tab 1: Payment History */}
      {activeTab === 'payments' && (
        <div className={styles.card}>
          {payments.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              No payments recorded for this member.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Origin</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.payment_date)}</td>
                    <td style={{ fontWeight: 600, color: p.status === 'completed' ? '#16a34a' : '#94a3b8' }}>
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td>{p.payment_method}</td>
                    <td>{p.reference || '—'}</td>
                    <td>
                      <Badge variant="neutral">{p.record_origin}</Badge>
                    </td>
                    <td>
                      {p.status === 'completed' ? (
                        <Badge variant="success">Completed</Badge>
                      ) : (
                        <Badge variant="danger" showDot={false}>
                          Voided ({p.void_reason || 'Reversed'})
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Attendance History */}
      {activeTab === 'attendance' && (
        <div className={styles.card}>
          {attendance.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              No attendance records logged for this member.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status at Check-In</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDate(a.check_in_local_date)}</td>
                    <td>{a.check_in_local_time}</td>
                    <td>
                      {a.is_expired_warning ? (
                        <Badge variant="danger">Expired at Check-in</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </td>
                    <td>{a.created_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Renewal Modal */}
      {isRenewModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsRenewModalOpen(false)}
          title={`Renew Membership — ${member.full_name}`}
        >
          <form onSubmit={handleExecuteRenewal}>
            <div style={{ marginBottom: '14px', fontSize: '0.875rem' }}>
              Current Expiry:{' '}
              <strong>
                {member.current_membership ? formatDate(member.current_membership.expiry_date) : 'Expired / None'}
              </strong>
            </div>

            <Select
              label="Select Renewal Plan"
              required
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ₹${p.price} (${p.duration_value} ${p.duration_unit}s)`,
              }))}
            />

            {renewalPreview && (
              <div className={styles.noticeBox} style={{ margin: '14px 0' }}>
                <div style={{ fontWeight: 600 }}>Calculated Membership Period:</div>
                <div>
                  Starts: <strong>{formatDate(renewalPreview.calculated_start_date)}</strong> → Ends:{' '}
                  <strong>{formatDate(renewalPreview.calculated_expiry_date)}</strong> (Inclusive)
                </div>
                {renewalPreview.is_extended_from_expiry && (
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#166534' }}>
                    ✓ Preserving unused paid days: Starts on the day after current expiry.
                  </div>
                )}
              </div>
            )}

            <Input
              label="Payment Amount (INR ₹)"
              type="number"
              min={0}
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
            />

            <Input
              label="Payment Date"
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />

            <Select
              label="Payment Method"
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              options={[
                { value: 'Cash', label: 'Cash' },
                { value: 'UPI', label: 'UPI / QR Code' },
                { value: 'Card', label: 'Debit / Credit Card' },
                { value: 'Bank Transfer', label: 'Bank Transfer' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsRenewModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isRenewing}>
                Confirm Renewal & Append Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Manual Expiry Migration Modal */}
      {isMigrateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsMigrateModalOpen(false)}
          title={`Manual Expiry Migration — ${member.full_name}`}
        >
          <form onSubmit={handleExecuteMigration}>
            <div className={styles.noticeBox} style={{ marginBottom: '14px' }}>
              ℹ️ <strong>Audited Action:</strong> Manually adjusting an expiry date updates membership validity without
              creating a fake payment record or distorting revenue statistics.
            </div>

            <Input
              label="New Expiry Date"
              type="date"
              required
              value={newMigratedExpiry}
              onChange={(e) => setNewMigratedExpiry(e.target.value)}
            />

            <Input
              label="Audit Reason (Mandatory)"
              required
              value={migrationReason}
              onChange={(e) => setMigrationReason(e.target.value)}
              placeholder="e.g. Migrated from offline punch card; medical leave extension granted"
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsMigrateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isMigrating}>
                Save Expiry Migration
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit Details — ${member.full_name}`}
        >
          <form onSubmit={handleSaveProfileEdit}>
            <Input
              label="Full Name"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              label="Phone Number"
              required
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
            <Input
              label="Notes"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Notes..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <Button variant="secondary" type="button" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSavingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Photo Update Modal */}
      {isPhotoModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsPhotoModalOpen(false)}
          title={`Update Profile Photo — ${member.full_name}`}
        >
          <form onSubmit={handlePhotoUpload}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setPhotoFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              {member.photo?.url && (
                <Button variant="danger" size="sm" type="button" onClick={handlePhotoRemove}>
                  Delete Current Photo
                </Button>
              )}
              <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                <Button variant="secondary" type="button" onClick={() => setIsPhotoModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={!photoFile} isLoading={isUploadingPhoto}>
                  Upload & Replace
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

