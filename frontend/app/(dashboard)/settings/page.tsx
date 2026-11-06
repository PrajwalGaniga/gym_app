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
        setGymName(s.gym_name);
        setTimezone(s.timezone);
        setCurrency(s.currency);
        setPhoneCode(s.country_calling_code);
        setPrefix(s.member_code_prefix);
        setAttendanceEnabled(s.attendance_enabled);
        setDuplicateWindow(s.duplicate_checkin_window_minutes);
        setExpiredPolicy(s.expired_checkin_policy);
        setDateFormat(s.date_format);
      })
      .catch((err) => setMessage({ text: err.message, type: 'error' }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setMessage(null);
      await api.updateSettings({
        gym_name: gymName.trim(),
        timezone,
        currency,
        country_calling_code: phoneCode,
        member_code_prefix: prefix.trim(),
        attendance_enabled: attendanceEnabled,
        duplicate_checkin_window_minutes: Number(duplicateWindow),
        expired_checkin_policy: expiredPolicy,
        date_format: dateFormat,
      });
      setMessage({ text: 'Gym settings updated successfully!', type: 'success' });
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
          <p className={styles.subtitle}>Configure gym identity, timezone calculations, and check-in policies.</p>
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
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className={styles.formSectionTitle}>Gym Identity & Localization</div>
          <div className={styles.formGrid}>
            <Input
              label="Gym Name"
              required
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. IronPulse Fitness Club"
            />
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
          </div>

          <div className={styles.formSectionTitle}>Member ID Generation</div>
          <div className={styles.formGrid}>
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

          <div className={styles.formSectionTitle}>Attendance & Check-In Policies</div>
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
