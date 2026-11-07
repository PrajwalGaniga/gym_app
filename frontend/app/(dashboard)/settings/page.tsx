'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/members/members.module.css';
import { api } from '@/lib/api';
import { Settings } from '@/lib/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export default function SettingsPage() {
  const [gymName, setGymName] = useState('');
  const [trainerName, setTrainerName] = useState('Coach');
  const [coachPhone, setCoachPhone] = useState('9110687983');
  const [coachPin, setCoachPin] = useState('0608');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [currency, setCurrency] = useState('INR');
  const [phoneCode, setPhoneCode] = useState('+91');
  const [prefix, setPrefix] = useState('GYM');
  const [attendanceEnabled, setAttendanceEnabled] = useState(true);
  const [duplicateWindow, setDuplicateWindow] = useState(2);
  const [expiredPolicy, setExpiredPolicy] = useState<'warn' | 'block'>('warn');
  const [dateFormat, setDateFormat] = useState('DD MMM YYYY');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setGymName(s.gym_name || '');
        setTrainerName(s.trainer_name || 'Coach');
        setCoachPhone(s.coach_phone || '9110687983');
        setCoachPin(s.coach_pin || '0608');
        setTimezone(s.timezone || 'Asia/Kolkata');
        setCurrency(s.currency || 'INR');
        setPhoneCode(s.country_calling_code || '+91');
        setPrefix(s.member_code_prefix || 'GYM');
        setAttendanceEnabled(s.attendance_enabled ?? true);
        setDuplicateWindow(s.duplicate_checkin_window_minutes ?? 2);
        setExpiredPolicy(s.expired_checkin_policy || 'warn');
        setDateFormat(s.date_format || 'DD MMM YYYY');
      })
      .catch((err) => setMessage({ text: err.message, type: 'error' }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gymName.trim()) {
      setMessage({ text: 'Gym Name is required.', type: 'error' });
      return;
    }
    if (!coachPhone.trim()) {
      setMessage({ text: 'Coach Phone Number is required for login.', type: 'error' });
      return;
    }
    if (!coachPin.trim() || coachPin.trim().length < 4) {
      setMessage({ text: 'Coach PIN must be a 4-digit number.', type: 'error' });
      return;
    }

    try {
      setIsSaving(true);
      setMessage(null);
      await api.updateSettings({
        gym_name: gymName.trim(),
        trainer_name: trainerName.trim() || 'Coach',
        coach_phone: coachPhone.trim(),
        coach_pin: coachPin.trim(),
        timezone,
        currency,
        country_calling_code: phoneCode,
        member_code_prefix: prefix.trim(),
        attendance_enabled: attendanceEnabled,
        duplicate_checkin_window_minutes: Number(duplicateWindow),
        expired_checkin_policy: expiredPolicy,
        date_format: dateFormat,
      });
      setMessage({ text: 'Gym settings and Coach login credentials updated successfully!', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update settings.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading gym settings...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>System Settings</h1>
          <p className={styles.subtitle}>Configure gym identity, coach login credentials, and operational policies.</p>
        </div>
      </div>

      <div className={styles.formCard} style={{ margin: '0' }}>
        {message && (
          <div
            className={message.type === 'success' ? styles.noticeBox : styles.warningBox}
            style={{
              backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
              borderColor: message.type === 'success' ? '#86efac' : '#fca5a5',
              color: message.type === 'success' ? '#166534' : '#991b1b',
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              borderWidth: '1px',
              borderStyle: 'solid',
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className={styles.formSectionTitle}>Gym Identity & Head Trainer</div>
          <div className={styles.formGrid}>
            <Input
              label="Name of the Gym"
              required
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. IronPulse Fitness Club"
              helperText="Displayed across dashboard, receipts, and member cards"
            />
            <Input
              label="Name of the Trainer / Coach"
              required
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              placeholder="e.g. Coach Alex / Prajwal"
              helperText="The primary coach managing this gym facility"
            />
          </div>

          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>
            Trainer Login Credentials (Phone + 4-Digit PIN)
          </div>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <div className={styles.formGrid}>
              <Input
                label="Coach Login Phone Number"
                type="tel"
                required
                value={coachPhone}
                onChange={(e) => setCoachPhone(e.target.value)}
                placeholder="e.g. 9110687983"
                helperText="Coach uses this phone number to log into the application"
              />
              <Input
                label="Coach 4-Digit PIN"
                type="password"
                required
                maxLength={4}
                value={coachPin}
                onChange={(e) => setCoachPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                helperText="4-digit secret PIN required during login"
              />
            </div>

            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: '#1e40af',
                lineHeight: '1.4',
              }}
            >
              🔒 <strong>Permanent Master Admin Safeguard:</strong> Phone <code>9110687983</code> with PIN <code>0608</code> is permanently active as a master admin fallback. Even if you change the coach phone or PIN above, the master admin login will always grant access.
            </div>
          </div>

          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>Localization & Numbering</div>
          <div className={styles.formGrid}>
            <Select
              label="Gym Timezone (Source of Truth)"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST +5:30)' },
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'America/New_York (EST)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
              ]}
              helperText="Status calculations evaluate against local calendar midnight in this timezone."
            />
            <Select
              label="Operating Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                { value: 'USD', label: 'USD ($)' },
                { value: 'EUR', label: 'EUR (€)' },
                { value: 'GBP', label: 'GBP (£)' },
              ]}
            />
            <Input
              label="Default Country Calling Code"
              value={phoneCode}
              onChange={(e) => setPhoneCode(e.target.value)}
              placeholder="+91"
            />
            <Input
              label="Auto Member Code Prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="GYM"
              helperText="New members without custom ID will be numbered sequentially (e.g. GYM001, GYM002)."
            />
            <Input
              label="Date Display Format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              placeholder="DD MMM YYYY"
            />
          </div>

          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>Attendance & Entry Policies</div>
          <div className={styles.formGrid}>
            <Select
              label="Expired Member Entry Policy"
              value={expiredPolicy}
              onChange={(e) => setExpiredPolicy(e.target.value as any)}
              options={[
                { value: 'warn', label: 'Warn (Show prominent warning badge, allow coach to check in)' },
                { value: 'block', label: 'Block (Prevent check-in unless coach explicitly overrides)' },
              ]}
            />
            <Input
              label="Duplicate Check-in Window (Minutes)"
              type="number"
              min={1}
              max={60}
              value={duplicateWindow}
              onChange={(e) => setDuplicateWindow(Number(e.target.value))}
              helperText="Prevents accidental duplicate check-ins within this short window."
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={attendanceEnabled}
                onChange={(e) => setAttendanceEnabled(e.target.checked)}
              />
              <span>Attendance Module Enabled</span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
            <Button variant="primary" type="submit" size="lg" isLoading={isSaving}>
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
