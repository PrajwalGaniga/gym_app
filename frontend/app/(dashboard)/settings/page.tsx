'use client';

import React, { useState, useEffect, useRef } from 'react';
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

  // GPS Geofence & Check-In Settings
  const [gymLatitude, setGymLatitude] = useState('');
  const [gymLongitude, setGymLongitude] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState(100);
  const [geofenceEnabled, setGeofenceEnabled] = useState(true);
  const [sundayWeeklyOff, setSundayWeeklyOff] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [checkinUrl, setCheckinUrl] = useState('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Determine public check-in URL based on current host
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setCheckinUrl(`${origin}/checkin`);
    }

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

        // GPS Geofencing
        if (s.gym_latitude !== undefined && s.gym_latitude !== null) {
          setGymLatitude(String(s.gym_latitude));
        }
        if (s.gym_longitude !== undefined && s.gym_longitude !== null) {
          setGymLongitude(String(s.gym_longitude));
        }
        setGeofenceRadius(s.geofence_radius_meters ?? 100);
        setGeofenceEnabled(s.geofence_enabled ?? true);
        const weeklyOff = s.weekly_off_days || [6];
        setSundayWeeklyOff(weeklyOff.includes(6));
      })
      .catch((err) => setMessage({ text: err.message, type: 'error' }))
      .finally(() => setIsLoading(false));
  }, []);

  // Render QR code to preview canvas whenever checkinUrl is set
  useEffect(() => {
    if (checkinUrl && qrCanvasRef.current) {
      import('qrcode').then((QRCodeModule) => {
        const QRCode = QRCodeModule.default || QRCodeModule;
        if (qrCanvasRef.current) {
          QRCode.toCanvas(qrCanvasRef.current, checkinUrl, {
            width: 220,
            margin: 2,
            color: { dark: '#0f172a', light: '#ffffff' },
          }).catch((err: any) => console.error('Failed to render QR canvas:', err));
        }
      });
    }
  }, [checkinUrl]);

  // One-click GPS location detection for gym
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGymLatitude(pos.coords.latitude.toFixed(6));
        setGymLongitude(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        setMessage({
          text: `📍 Location detected: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}. Click 'Save Settings' below to apply.`,
          type: 'success',
        });
      },
      (err) => {
        setIsLocating(false);
        alert(`Could not detect location: ${err.message}. Please enable GPS permissions in your browser or type coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // High-Resolution Printable Poster Download (1200x1600 px)
  const handleDownloadPoster = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1600;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 1600);
      gradient.addColorStop(0, '#0f172a');
      gradient.addColorStop(0.5, '#1e293b');
      gradient.addColorStop(1, '#0f172a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 1600);

      // Gold / Blue Outer Accent Border
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 10;
      ctx.strokeRect(40, 40, 1120, 1520);

      // Gym Title Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(gymName || 'Muscle Hunt', 600, 145);

      ctx.fillStyle = '#60a5fa';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillText('⚡ MEMBER EXPRESS CHECK-IN', 600, 200);

      // White Card for crisp QR code scanning
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(160, 260, 880, 880, [36]);
      ctx.fill();

      // Generate large QR code DataURL and render onto canvas
      const QRCodeModule = await import('qrcode');
      const QRCode = QRCodeModule.default || QRCodeModule;
      const qrDataUrl = await QRCode.toDataURL(checkinUrl, {
        width: 800,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });

      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        qrImg.onload = resolve;
      });
      ctx.drawImage(qrImg, 200, 300, 800, 800);

      // Instructions block
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 40px system-ui, sans-serif';
      ctx.fillText('SCAN WITH PHONE CAMERA', 600, 1210);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 30px system-ui, sans-serif';
      ctx.fillText('1. Point camera at QR code to open check-in', 600, 1275);
      ctx.fillText('2. Enter your Member ID & Last 2 phone digits', 600, 1330);
      ctx.fillText('3. View your daily streak, due date & payment history!', 600, 1385);

      // Brand badge
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillText('💪 BE CONSISTENT. STAY UNSTOPPABLE.', 600, 1465);

      ctx.fillStyle = '#64748b';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText('Muscle Hunt Gym Management & Fee System', 600, 1515);

      // Trigger high-res file download
      const downloadLink = document.createElement('a');
      downloadLink.download = `${(gymName || 'Muscle_Hunt').replace(/\s+/g, '_')}_CheckIn_QR_Poster.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    } catch (err: any) {
      alert('Failed to generate poster: ' + err.message);
    }
  };

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

      const lat = gymLatitude.trim() ? parseFloat(gymLatitude.trim()) : null;
      const lon = gymLongitude.trim() ? parseFloat(gymLongitude.trim()) : null;

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
        gym_latitude: lat,
        gym_longitude: lon,
        geofence_radius_meters: Number(geofenceRadius),
        geofence_enabled: geofenceEnabled,
        weekly_off_days: sundayWeeklyOff ? [6] : [],
      });
      setMessage({ text: 'Gym settings, geofencing, and login credentials updated successfully!', type: 'success' });
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
          <p className={styles.subtitle}>Configure gym identity, QR check-in geofence, and operational policies.</p>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '12px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {message.text}
        </div>
      )}

      {/* =========================================================================
          1. Gym Entrance QR Check-In Card
          ========================================================================= */}
      <div className={styles.formCard} style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.4rem' }}>📱</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>Gym Entrance Check-In QR Code</h2>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0, maxWidth: '540px' }}>
              Print this high-resolution poster for your front desk. Members scan this QR code with their phone camera to check in, track daily streaks, and view dues.
            </p>
            <div style={{ marginTop: '12px', fontSize: '0.8125rem', color: '#38bdf8' }}>
              🔗 Public Check-In URL: <code>{checkinUrl}</code>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '16px', borderRadius: '16px' }}>
            <canvas ref={qrCanvasRef} style={{ borderRadius: '8px' }} />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDownloadPoster}
              style={{ width: '100%', fontWeight: 700 }}
            >
              📥 Download Printable Poster (PNG)
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. Main Gym Settings Form
          ========================================================================= */}
      <div className={styles.formCard}>
        <form onSubmit={handleSave}>
          <div className={styles.formSectionTitle}>Gym Identity & Branding</div>
          <div className={styles.formGrid}>
            <Input
              label="Gym Name"
              required
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="e.g. Muscle Hunt"
            />
            <Input
              label="Trainer / Coach Display Name"
              value={trainerName}
              onChange={(e) => setTrainerName(e.target.value)}
              placeholder="e.g. Coach Prajwal"
            />
          </div>

          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>Coach Access Credentials (PIN Login)</div>
          <div className={styles.formGrid}>
            <Input
              label="Coach Phone Number (Login ID)"
              type="tel"
              required
              value={coachPhone}
              onChange={(e) => setCoachPhone(e.target.value)}
              placeholder="e.g. 9110687983"
              helperText="Used to sign in directly from the login screen."
            />
            <Input
              label="4-Digit Security PIN"
              type="password"
              required
              maxLength={8}
              value={coachPin}
              onChange={(e) => setCoachPin(e.target.value)}
              placeholder="••••"
              helperText="Security PIN for fast 1-tap mobile dashboard access."
            />
          </div>

          {/* GPS Geofencing & Rest Day Section */}
          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>📍 GPS Geofencing & Rest Days (Anti-Cheat)</div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '-6px', marginBottom: '16px' }}>
            Prevents members from checking in from home. The system verifies their device GPS is within the gym's perimeter.
          </p>

          <div className={styles.formGrid}>
            <div>
              <Input
                label="Gym Latitude"
                type="text"
                value={gymLatitude}
                onChange={(e) => setGymLatitude(e.target.value)}
                placeholder="e.g. 12.971600"
                helperText="Latitude coordinate of your gym floor."
              />
            </div>
            <div>
              <Input
                label="Gym Longitude"
                type="text"
                value={gymLongitude}
                onChange={(e) => setGymLongitude(e.target.value)}
                placeholder="e.g. 77.594600"
                helperText="Longitude coordinate of your gym floor."
              />
            </div>
          </div>

          <div style={{ marginTop: '8px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleDetectLocation}
              isLoading={isLocating}
            >
              📍 Set to My Current Location
            </Button>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              (Stand inside your gym and tap to auto-detect coordinates)
            </span>
          </div>

          <div className={styles.formGrid}>
            <Input
              label="Allowed Radius (Meters)"
              type="number"
              min={20}
              max={1000}
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(Number(e.target.value))}
              helperText="Recommended: 100 meters (covers gym floor and parking)."
            />
          </div>

          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={geofenceEnabled}
                onChange={(e) => setGeofenceEnabled(e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>Enable GPS Geofence Verification</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sundayWeeklyOff}
                onChange={(e) => setSundayWeeklyOff(e.target.checked)}
              />
              <span style={{ fontWeight: 600, color: '#1e293b' }}>
                Sunday is Gym Rest Day / Weekly Off (Never breaks workout streaks 🔥)
              </span>
            </label>
          </div>

          <div className={styles.formSectionTitle} style={{ marginTop: '24px' }}>Regional & Format Configurations</div>
          <div className={styles.formGrid}>
            <Select
              label="Timezone"
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
