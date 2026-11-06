'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Plan } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function NewMemberPage() {
  const router = useRouter();
  const todayStr = new Date().toISOString().split('T')[0];

  const [plans, setPlans] = useState<Plan[]>([]);
  const [fullName, setFullName] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [phone, setPhone] = useState('');
  const [joiningDate, setJoiningDate] = useState(todayStr);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.getPlans().then((fetchedPlans) => {
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        setSelectedPlanId(fetchedPlans[0].id);
        setAmountPaid(fetchedPlans[0].price);
      }
    });
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setAmountPaid(plan.price);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !selectedPlanId) {
      setErrorMessage('Please fill in all mandatory fields.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      // 1. Create Member
      const member = await api.createMember({
        full_name: fullName.trim(),
        member_code: memberCode.trim() || undefined,
        phone: phone.trim(),
        joining_date: joiningDate,
        plan_id: selectedPlanId,
        start_date: startDate,
        payment_date: paymentDate,
        amount_paid: Number(amountPaid),
        payment_method: paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // 2. If photo was selected, upload photo
      if (photoFile) {
        try {
          await api.uploadMemberPhoto(member.id, photoFile);
        } catch (photoErr: any) {
          console.warn('Photo upload warning:', photoErr);
        }
      }

      router.push(`/members/${member.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>New Member Registration</h1>
          <p className={styles.subtitle}>Register a brand new member, configure their initial membership plan and payment.</p>
        </div>
        <Link href="/members">
          <Button variant="secondary">← Back to Directory</Button>
        </Link>
      </div>

      <div className={styles.formCard}>
        {errorMessage && <div className={styles.warningBox}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formSectionTitle}>Personal Information</div>
          <div className={styles.formGrid}>
            <Input
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Verma"
            />
            <Input
              label="Member ID / Code (Leave blank for auto-generated GYMxxx)"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. GYM042 (Auto-generates if blank)"
            />
            <Input
              label="Phone Number"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210 or +919876543210"
              helperText="Families can share the same contact number."
            />
            <Input
              label="Joining Date"
              type="date"
              required
              value={joiningDate}
              onChange={(e) => {
                setJoiningDate(e.target.value);
                setStartDate(e.target.value);
                setPaymentDate(e.target.value);
              }}
            />
          </div>

          {/* Profile Photo */}
          <div className={styles.formSectionTitle}>Profile Photograph</div>
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
                JPEG, PNG, or WebP up to 5MB. Persists permanently across renewals.
              </div>
            </div>
          </div>

          <div className={styles.formSectionTitle}>Membership Plan & Duration</div>
          <div className={styles.formGrid}>
            <Select
              label="Select Membership Plan"
              required
              value={selectedPlanId}
              onChange={(e) => handlePlanChange(e.target.value)}
              options={plans.map((p) => ({
                value: p.id,
                label: `${p.name} — ₹${p.price} (${p.duration_value} ${p.duration_unit}s)`,
              }))}
            />
            <Input
              label="Membership Start Date"
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              helperText="Calendar-month calculations automatically clamp to month ends."
            />
          </div>

          <div className={styles.formSectionTitle}>Initial Payment Record</div>
          <div className={styles.formGrid}>
            <Input
              label="Amount Paid (INR ₹)"
              type="number"
              min={0}
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
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
            <Input
              label="Transaction Reference / Note (Optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UPI Ref 38472918274"
            />
          </div>

          <Input
            label="Additional Member Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Referred by member Arun, prefers evening slot"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <Link href="/members">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
              Confirm & Create Member Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
