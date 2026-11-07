'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Plan } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CameraCaptureModal } from '@/components/ui/CameraCaptureModal';

export default function NewMemberPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const [plans, setPlans] = useState<Plan[]>([]);
  const [fullName, setFullName] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [joiningDate, setJoiningDate] = useState(todayStr);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [paymentDate, setPaymentDate] = useState(todayStr);

  const [registrationFee] = useState<number>(100);
  const [planPrice, setPlanPrice] = useState<number>(500);
  const [amountPaid, setAmountPaid] = useState<number>(600); // 500 + 100 default
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // Photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.getPlans().then((fetchedPlans) => {
      setPlans(fetchedPlans);
      if (fetchedPlans.length > 0) {
        // Look for 1 Month or take the first plan
        const oneMonthPlan = fetchedPlans.find(
          (p) => p.duration_value === 1 && p.duration_unit === 'month'
        ) || fetchedPlans[0];

        setSelectedPlanId(oneMonthPlan.id);
        setPlanPrice(oneMonthPlan.price);
        setAmountPaid(oneMonthPlan.price + 100); // Total 600
      }
    });
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setPlanPrice(plan.price);
      setAmountPaid(plan.price + registrationFee);
    }
  };

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
        gender: gender,
        joining_date: joiningDate,
        plan_id: selectedPlanId,
        start_date: startDate,
        payment_date: paymentDate,
        amount_paid: Number(amountPaid),
        registration_fee: Number(registrationFee),
        payment_method: paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // 2. Upload photo if captured / selected
      if (photoFile) {
        try {
          await api.uploadMemberPhoto(member.id, photoFile);
        } catch (photoErr: any) {
          console.warn('Photo upload warning:', photoErr);
        }
      }

      router.push(`/members`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register member.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>New Member Registration</h1>
          <p className={styles.subtitle}>
            Register a new athlete with direct camera photo, first-time fee ₹600 (₹500 monthly + ₹100 registration fee).
          </p>
        </div>
        <Link href="/members">
          <Button variant="secondary">← Back to Directory</Button>
        </Link>
      </div>

      <div className={styles.formCard}>
        {errorMessage && <div className={styles.warningBox}>⚠️ {errorMessage}</div>}

        <form onSubmit={handleSubmit}>
          {/* Section: Profile Photograph with Live Camera */}
          <div className={styles.formSectionTitle}>1. Profile Photograph</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '16px',
              backgroundColor: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              marginBottom: '24px',
            }}
          >
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Member Preview"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #2563eb',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                }}
              >
                👤
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCameraOpen(true)}
                >
                  📸 Open Camera & Take Photo
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 Upload from Files
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
              <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                Take a direct snapshot with the camera or choose an image file.
              </span>
            </div>
          </div>

          {/* Section: Basic Details */}
          <div className={styles.formSectionTitle}>2. Member Basic Details</div>
          <div className={styles.formGrid}>
            <Input
              label="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
            />
            <Input
              label="Phone Number"
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              helperText="Contact number for SMS and fee reminders."
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
            <Input
              label="Date of Registration (Joining Date)"
              type="date"
              required
              value={joiningDate}
              onChange={(e) => {
                setJoiningDate(e.target.value);
                setStartDate(e.target.value);
                setPaymentDate(e.target.value);
              }}
              helperText="Defaults to Today."
            />
            <Input
              label="Member ID / Code (Auto-generates if blank)"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              placeholder="e.g. GYM042 (Leave blank for auto)"
            />
          </div>

          {/* Section: Membership Plan & Duration */}
          <div className={styles.formSectionTitle}>3. Initial Membership Plan</div>
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
              helperText="Start date for calendar calculation."
            />
          </div>

          {/* Fee Breakdown Alert */}
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #10b981',
              borderRadius: '10px',
              padding: '16px 20px',
              marginTop: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#065f46' }}>
                  💰 Total First-Time Registration Fees: ₹{amountPaid}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#047857', marginTop: '4px' }}>
                  ₹{planPrice} Monthly Membership + ₹{registrationFee} One-Time Registration Fee = <strong>₹{amountPaid}</strong>
                </div>
              </div>
              <span style={{ fontSize: '1.75rem' }}>🏷️</span>
            </div>
          </div>

          {/* Section: Payment Details */}
          <div className={styles.formSectionTitle}>4. Payment Collection</div>
          <div className={styles.formGrid}>
            <Input
              label="Amount Collected (INR ₹)"
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
              placeholder="e.g. UPI Ref / Cash receipt number"
            />
          </div>

          <Input
            label="Additional Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning batch, personal goal: weight loss"
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
            <Link href="/members">
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>
            <Button variant="primary" type="submit" isLoading={isLoading} size="lg">
              ✅ Register Member & Collect ₹{amountPaid}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
