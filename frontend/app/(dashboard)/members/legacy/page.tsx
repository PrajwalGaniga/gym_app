'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CameraCaptureModal } from '@/components/ui/CameraCaptureModal';

export default function LegacyMemberPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [joiningDateKnown, setJoiningDateKnown] = useState(false);
  const [joiningDate, setJoiningDate] = useState('');
  const [hasExpiryDate, setHasExpiryDate] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [hasPaymentHistory, setHasPaymentHistory] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [migrationNotes, setMigrationNotes] = useState('');
  
  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    setPhotoFile(file);
    setPhotoPreview(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberCode.trim() || !fullName.trim() || !phone.trim()) {
      setErrorMessage('Please fill in Member ID, Full Name, and Phone Number.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      // Create Legacy Member
      const member = await api.createLegacyMember({
        member_code: memberCode.trim(),
        full_name: fullName.trim(),
        phone: phone.trim(),
        gender: gender,
        joining_date: joiningDateKnown && joiningDate ? joiningDate : undefined,
        joining_date_known: joiningDateKnown,
        current_expiry_date: hasExpiryDate && expiryDate ? expiryDate : undefined,
        payment_amount: hasPaymentHistory && paymentAmount !== '' ? Number(paymentAmount) : undefined,
        payment_date: hasPaymentHistory && paymentDate ? paymentDate : undefined,
        payment_method: hasPaymentHistory ? paymentMethod : undefined,
        migration_notes: migrationNotes.trim() || undefined,
      });

      // Upload photo if selected
      if (photoFile) {
        try {
          await api.uploadMemberPhoto(member.id, photoFile);
        } catch (photoErr: any) {
          console.warn('Photo upload warning:', photoErr);
        }
      }

      router.push(`/members`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register legacy member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Add Existing / Legacy Member</h1>
          <p className={styles.subtitle}>
            Register members who joined months or years earlier. Existing member ID is preserved exactly, no registration fee is added.
          </p>
        </div>
        <Link href="/members">
          <Button variant="secondary">← Back to Directory</Button>
        </Link>
      </div>

      <div className={styles.noticeBox}>
        ℹ️ <strong>Existing Member Migration:</strong> Old Member ID is kept intact. No ₹100 registration fee is charged. If the joining date is unknown, leave unchecked.
      </div>

      <div className={styles.formCard}>
        {errorMessage && <div className={styles.warningBox}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formSectionTitle}>1. Permanent Identity</div>
          <div className={styles.formGrid}>
            <Input
              label="Existing Member ID / Register Number"
              required
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. 101 or OLD-042"
              helperText="Preserved verbatim. Duplicate IDs are checked to prevent collision."
            />
            <Input
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vikram Malhotra"
            />
            <Input
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              helperText="Contact number for gym records."
            />
            <Select
              label="Gender"
              required
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              options={[
                { value: 'Male', label: 'Male' },
                { value: 'Female', label: 'Female' },
                { value: 'Other', label: 'Other' },
              ]}
            />
          </div>

          {/* Optional Joining Date */}
          <div style={{ marginTop: '16px', marginBottom: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={joiningDateKnown}
                onChange={(e) => setJoiningDateKnown(e.target.checked)}
              />
              <span>Original joining date is known (Joined recently)</span>
            </label>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              Leave unchecked if member joined months or years earlier and exact joining date is not remembered.
            </div>
            {joiningDateKnown && (
              <div style={{ marginTop: '10px', maxWidth: '300px' }}>
                <Input
                  label="Original Joining Date"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Profile Photo */}
          <div className={styles.formSectionTitle}>2. Member Photograph (Optional)</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '20px',
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #2563eb' }}
              />
            ) : (
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                }}
              >
                👤
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsCameraOpen(true)}
                >
                  📸 Open Camera
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Choose File
                </Button>
                {photoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  >
                    ✕ Remove
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handlePhotoSelect}
              />
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Photo is optional for existing members. You can capture it now or add later.
              </span>
            </div>
          </div>

          {/* Current Expiry Date */}
          <div className={styles.formSectionTitle}>3. Current Membership Validity</div>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={hasExpiryDate}
                onChange={(e) => setHasExpiryDate(e.target.checked)}
              />
              <span>Member has an active or known expiry date</span>
            </label>

            {hasExpiryDate && (
              <div style={{ maxWidth: '300px', marginTop: '10px' }}>
                <Input
                  label="Current Expiry Date"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  helperText="Valid through the end of this date."
                />
              </div>
            )}
          </div>

          {/* Optional Payment History */}
          <div className={styles.formSectionTitle}>4. Recent Fee Record (Optional)</div>
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={hasPaymentHistory}
                onChange={(e) => setHasPaymentHistory(e.target.checked)}
              />
              <span>Record payment collected from member</span>
            </label>

            {hasPaymentHistory && (
              <div className={styles.formGrid} style={{ marginTop: '10px' }}>
                <Input
                  label="Amount Collected (INR ₹)"
                  type="number"
                  min={0}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 500 or 1000"
                />
                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
                <Select
                  label="Payment Method"
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
              </div>
            )}
          </div>

          <Input
            label="Migration Notes / Register Details (Optional)"
            value={migrationNotes}
            onChange={(e) => setMigrationNotes(e.target.value)}
            placeholder="e.g. Joined early 2024, regular gym member."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Link href="/members">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
              Save Existing Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
