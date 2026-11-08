'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './card_modal.module.css';
import { api } from '@/lib/api';
import { Member, Payment, Plan } from '@/lib/types';
import { formatDate, getStatusBadgeDetails } from '@/lib/formatters';
import { Button } from '../ui/Button';
import { CameraCaptureModal } from '../ui/CameraCaptureModal';

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

  // Photo viewer and update states
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentMember(member);
    if (member) {
      setIsLoadingPayments(true);
      setShowRenewalForm(false);
      setRenewalMessage('');
      setPhotoError('');
      setPhotoSuccess('');
      setIsFullscreenOpen(false);
      setIsPhotoMenuOpen(false);

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
  const avatarUrl = displayMember.photo?.url || displayMember.photo?.thumbnail_url;
  const initials = displayMember.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Photo Upload Handler (Camera capture or File select)
  const handleUploadPhoto = async (file: File) => {
    try {
      setIsUploadingPhoto(true);
      setPhotoError('');
      setPhotoSuccess('');

      const photoInfo = await api.uploadMemberPhoto(displayMember.id, file);

      // Real-time update in modal
      setCurrentMember((prev) =>
        prev
          ? {
              ...prev,
              photo: photoInfo,
            }
          : null
      );

      setPhotoSuccess('✅ Profile photo updated successfully!');
      setTimeout(() => setPhotoSuccess(''), 4000);
      setIsPhotoMenuOpen(false);
      setIsCameraOpen(false);

      // Refresh parent card grid
      if (onRenewed) {
        onRenewed();
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadPhoto(e.target.files[0]);
    }
  };

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

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          {/* =========================================================================
              1. Hero Profile Photo Header (Matching Image 2)
              ========================================================================= */}
          <div className={styles.heroHeaderContainer}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayMember.full_name}
                className={styles.heroPhotoImage}
                onClick={() => setIsFullscreenOpen(true)}
                title="Click to view full image"
              />
            ) : (
              <div className={styles.heroPlaceholder}>
                <div className={styles.heroPlaceholderAvatar}>{initials}</div>
                <button
                  type="button"
                  className={styles.heroActionPill}
                  onClick={() => setIsPhotoMenuOpen(true)}
                >
                  📸 Add Profile Picture
                </button>
              </div>
            )}

            {/* Dark Gradient Overlay for readability */}
            <div className={styles.heroPhotoGradient} />

            {/* Top Floating Actions Over Photo */}
            <div className={styles.heroTopActions}>
              <button
                type="button"
                className={styles.heroCircleBtn}
                onClick={onClose}
                aria-label="Back"
                title="Back"
              >
                ←
              </button>

              <div className={styles.heroTopRightGroup}>
                <button
                  type="button"
                  className={styles.heroActionPill}
                  onClick={() => setIsPhotoMenuOpen(true)}
                  title="Update profile picture"
                >
                  📷 Update Photo
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    className={styles.heroCircleBtn}
                    onClick={() => setIsFullscreenOpen(true)}
                    title="Click to view full image"
                  >
                    ⛶
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Overlay Info on Photo */}
            <div className={styles.heroBottomInfo}>
              <h2 className={styles.heroMemberName}>{displayMember.full_name}</h2>

              <div className={styles.heroBadges}>
                <span className={styles.heroBadgeCode}>ID: {displayMember.member_code}</span>
                {displayMember.gender && (
                  <span className={styles.heroBadgeGender}>
                    {displayMember.gender === 'Male'
                      ? '♂ Male'
                      : displayMember.gender === 'Female'
                      ? '♀ Female'
                      : displayMember.gender}
                  </span>
                )}
                <span
                  className={
                    displayMember.status === 'paid'
                      ? styles.heroBadgePaid
                      : displayMember.status === 'expiring_soon'
                      ? styles.heroBadgeExpiring
                      : styles.heroBadgeExpired
                  }
                >
                  {badge.label}
                </span>
              </div>

              <a
                href={`tel:${displayMember.phone}`}
                className={styles.heroPhone}
                onClick={(e) => e.stopPropagation()}
              >
                📞 {displayMember.phone}
              </a>
            </div>
          </div>

          {/* =========================================================================
              2. Modal Body & Metric Cards (Matching Image 2)
              ========================================================================= */}
          <div className={styles.modalBody}>
            {/* Status alerts */}
            {photoSuccess && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                {photoSuccess}
              </div>
            )}
            {photoError && (
              <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                ⚠️ {photoError}
              </div>
            )}
            {isUploadingPhoto && (
              <div style={{ background: '#eff6ff', color: '#1d4ed8', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                ⏳ Uploading photo to Cloudinary...
              </div>
            )}
            {renewalMessage && (
              <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 600 }}>
                {renewalMessage}
              </div>
            )}

            {/* 4 Metric Cards */}
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricHeaderRow}>
                  <span>📅</span>
                  <span className={styles.metricLabel}>Joining Date</span>
                </div>
                <span className={styles.metricValue}>
                  {displayMember.joining_date_known && displayMember.joining_date
                    ? formatDate(displayMember.joining_date)
                    : 'Legacy (Unknown)'}
                </span>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeaderRow}>
                  <span>📅</span>
                  <span className={styles.metricLabel}>Last Paid Date</span>
                </div>
                <span className={styles.metricValue}>
                  {displayMember.last_payment_date ? formatDate(displayMember.last_payment_date) : 'None recorded'}
                </span>
              </div>

              <div className={styles.metricCard}>
                <div className={styles.metricHeaderRow}>
                  <span>🪪</span>
                  <span className={styles.metricLabel}>Months Completed</span>
                </div>
                <span className={styles.metricValue}>
                  {displayMember.total_months_completed ?? 0} {displayMember.total_months_completed === 1 ? 'Month' : 'Months'}
                </span>
              </div>

              <div className={`${styles.metricCard} ${styles.metricCardRevenue}`}>
                <div className={styles.metricHeaderRow}>
                  <span>📈</span>
                  <span className={styles.metricLabel} style={{ color: '#065f46' }}>Total Revenue</span>
                </div>
                <span className={`${styles.metricValue} ${styles.metricValueRevenue}`}>
                  ₹{(displayMember.lifetime_revenue || 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Current Membership Box */}
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>
                <span>🏆 Current Membership</span>
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

            {/* Vibrant Gradient Renew Button */}
            {showRenewalForm ? (
              <div style={{ background: '#f8fafc', border: '1.5px solid #2563eb', borderRadius: '16px', padding: '16px' }}>
                <div style={{ fontWeight: 700, color: '#1e3a8a', marginBottom: '12px', fontSize: '0.9375rem' }}>
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
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
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
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
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
              <button
                type="button"
                className={styles.gradientRenewBtn}
                onClick={() => setShowRenewalForm(true)}
              >
                <div className={styles.renewBtnContent}>
                  <span>🔄</span>
                  <span>Renew Membership</span>
                </div>
                <span>❯</span>
              </button>
            )}

            {/* Payment History */}
            <div className={styles.sectionBox}>
              <div className={styles.sectionTitle}>
                <span>💳 Member Payment History</span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  {payments.length} receipt{payments.length === 1 ? '' : 's'} ❯
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

          {/* Modal Footer */}
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

      {/* =========================================================================
          3. Fullscreen Lightbox Image Viewer (Matching Right Screen in Image 2)
          ========================================================================= */}
      {isFullscreenOpen && avatarUrl && (
        <div className={styles.fullscreenOverlay} onClick={() => setIsFullscreenOpen(false)}>
          <div className={styles.fullscreenTopBar} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.heroCircleBtn}
              onClick={() => setIsFullscreenOpen(false)}
              aria-label="Close full view"
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className={styles.heroActionPill}
                onClick={() => {
                  setIsFullscreenOpen(false);
                  setIsPhotoMenuOpen(true);
                }}
              >
                📷 Update Photo
              </button>
              <a
                href={avatarUrl}
                download={`${displayMember.full_name.replace(/\s+/g, '_')}_photo.jpg`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroCircleBtn}
                title="Download photo"
              >
                ↓
              </a>
              <a
                href={avatarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.heroCircleBtn}
                title="Open high resolution"
              >
                ↗
              </a>
            </div>
          </div>

          <div className={styles.fullscreenImageWrapper} onClick={(e) => e.stopPropagation()}>
            <img
              src={avatarUrl}
              alt={displayMember.full_name}
              className={styles.fullscreenImage}
            />
          </div>

          <div className={styles.fullscreenBottomBar} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fullscreenNamePill}>{displayMember.full_name}</div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. Photo Upload Options Bottom Sheet (Camera vs File Gallery)
          ========================================================================= */}
      {isPhotoMenuOpen && (
        <div className={styles.photoMenuOverlay} onClick={() => setIsPhotoMenuOpen(false)}>
          <div className={styles.photoMenuSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.photoMenuHandle} />
            <h3 className={styles.photoMenuTitle}>Update Profile Picture</h3>
            <p className={styles.photoMenuSubtitle}>
              Update photograph for {displayMember.full_name}
            </p>

            <button
              type="button"
              className={styles.photoMenuItem}
              onClick={() => {
                setIsPhotoMenuOpen(false);
                setIsCameraOpen(true);
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>📸</span>
              <div>
                <div>Take Photo with Camera</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                  Open mobile camera and take instant snapshot
                </div>
              </div>
            </button>

            <button
              type="button"
              className={styles.photoMenuItem}
              onClick={() => {
                fileInputRef.current?.click();
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>📁</span>
              <div>
                <div>Upload from Gallery / Files</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                  Select image from photo album or storage
                </div>
              </div>
            </button>

            <button
              type="button"
              className={styles.photoMenuCancelBtn}
              onClick={() => setIsPhotoMenuOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input for Gallery selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => {
          handleUploadPhoto(file);
        }}
      />
    </>
  );
};
