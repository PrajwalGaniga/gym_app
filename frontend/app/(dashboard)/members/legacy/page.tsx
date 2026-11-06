'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function LegacyMemberPage() {
  const router = useRouter();

  const [memberCode, setMemberCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDateKnown, setJoiningDateKnown] = useState(false);
  const [joiningDate, setJoiningDate] = useState('');
  const [hasExpiryDate, setHasExpiryDate] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [hasPaymentHistory, setHasPaymentHistory] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [migrationNotes, setMigrationNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
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

      router.push(`/members/${member.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register legacy member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Add Existing / Legacy Member</h1>
          <p className={styles.subtitle}>
            Seamlessly migrate an existing gym member into the system while strictly preserving their existing Member ID.
          </p>
        </div>
        <Link href="/members">
          <Button variant="secondary">← Back to Directory</Button>
        </Link>
      </div>

      <div className={styles.noticeBox}>
        ℹ️ <strong>Legacy Migration Rule:</strong> The existing member ID entered below will be preserved exactly as
        provided. Expiry dates migrated without genuine payment receipts will not distort financial revenue.
      </div>

      <div className={styles.formCard}>
        {errorMessage && <div className={styles.warningBox}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formSectionTitle}>Permanent Identity</div>
          <div className={styles.formGrid}>
            <Input
              label="Existing Member ID / Register Number"
              required
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. OLD-042 or GYM/2023/108"
              helperText="Preserved verbatim. Duplicate IDs are checked to prevent accidental overwriting."
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
              helperText="Non-unique. Family members can share contact numbers."
            />
          </div>

          {/* Optional Joining Date */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={joiningDateKnown}
                onChange={(e) => setJoiningDateKnown(e.target.checked)}
              />
              <span>Original joining date is known</span>
            </label>
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
          <div className={styles.formSectionTitle}>Member Photograph</div>
          <div className={styles.photoUploadBox}>
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                📷
              </div>
            )}
            <div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelect} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Upload profile photo if available. Persists permanently.
              </div>
            </div>
          </div>

          {/* Current Expiry Date */}
          <div className={styles.formSectionTitle}>Current Membership Validity</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={hasExpiryDate}
              onChange={(e) => setHasExpiryDate(e.target.checked)}
            />
            <span>Member has an active or known expiry date</span>
          </label>

          {hasExpiryDate && (
            <div style={{ maxWidth: '300px', marginBottom: '16px' }}>
              <Input
                label="Known Expiry Date"
                type="date"
                required
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                helperText="Inclusive through end of date in gym timezone."
              />
            </div>
          )}

          {/* Optional Payment History */}
          <div className={styles.formSectionTitle}>Historical Payment Record (Optional)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer', marginBottom: '12px' }}>
            <input
              type="checkbox"
              checked={hasPaymentHistory}
              onChange={(e) => setHasPaymentHistory(e.target.checked)}
            />
            <span>Record last genuine payment details from physical receipt / register</span>
          </label>

          {hasPaymentHistory && (
            <div className={styles.formGrid} style={{ marginBottom: '16px' }}>
              <Input
                label="Payment Amount (INR ₹)"
                type="number"
                min={0}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g. 4000"
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

          <Input
            label="Migration Notes / Reason"
            value={migrationNotes}
            onChange={(e) => setMigrationNotes(e.target.value)}
            placeholder="e.g. Migrated from paper register page 14; 3 months validity remaining."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Link href="/members">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
              Save Legacy Member
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
