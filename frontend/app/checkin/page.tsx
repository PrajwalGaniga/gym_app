'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/components/member-portal/portal.module.css';
import { api, ApiError } from '@/lib/api';
import { PortalCheckInResponse, PortalGymInfo } from '@/lib/types';
import { PortalTab, PortalTheme } from '@/components/member-portal/types';
import { PortalLogin } from '@/components/member-portal/PortalLogin';
import { PortalDashboard } from '@/components/member-portal/PortalDashboard';
import { PortalCalendar } from '@/components/member-portal/PortalCalendar';
import { PortalProfile } from '@/components/member-portal/PortalProfile';
import { CelebrationModal } from '@/components/member-portal/CelebrationModal';
import { BottomNav } from '@/components/member-portal/BottomNav';

export default function MemberPortalPage() {
  const [theme, setTheme] = useState<PortalTheme>('dark');
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [gymInfo, setGymInfo] = useState<PortalGymInfo | null>(null);

  const [savedMemberCode, setSavedMemberCode] = useState('');
  const [savedPhoneLast2, setSavedPhoneLast2] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checkInError, setCheckInError] = useState('');

  const [portalData, setPortalData] = useState<PortalCheckInResponse | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // Load saved credentials & theme from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('mh_portal_theme') as PortalTheme;
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light');
      }

      const storedCode = localStorage.getItem('gym_member_code');
      const storedPhone = localStorage.getItem('gym_phone_last_2');
      if (storedCode) setSavedMemberCode(storedCode);
      if (storedPhone) setSavedPhoneLast2(storedPhone);
    }

    api
      .getPortalGymInfo()
      .then((info) => setGymInfo(info))
      .catch((err) => console.error('Failed to load gym info:', err));
  }, []);

  const toggleTheme = () => {
    const nextTheme: PortalTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mh_portal_theme', nextTheme);
    }
  };

  // Step 1: Login ("Enter Gym Portal" - Accessible anywhere, no GPS required)
  const handleLogin = async (memberCode: string, phoneLast2: string, rememberMe: boolean) => {
    try {
      setIsLoggingIn(true);
      setLoginError('');

      const res = await api.portalLogin({
        member_code: memberCode,
        phone_last_2: phoneLast2,
      });

      if (rememberMe && typeof window !== 'undefined') {
        localStorage.setItem('gym_member_code', memberCode);
        localStorage.setItem('gym_phone_last_2', phoneLast2);
      } else if (!rememberMe && typeof window !== 'undefined') {
        localStorage.removeItem('gym_member_code');
        localStorage.removeItem('gym_phone_last_2');
      }

      setSavedMemberCode(memberCode);
      setSavedPhoneLast2(phoneLast2);
      setPortalData(res);
      setActiveTab('home');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setLoginError(err.message);
      } else {
        setLoginError(err.message || 'Verification failed. Please check your credentials.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Step 2: "Check In Today at Gym" (GPS Verified Action inside Gym)
  const handleCheckIn = () => {
    if (!portalData) return;

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsCheckingIn(true);
      setCheckInError('');

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await api.portalCheckIn({
              member_code: portalData.member_code,
              phone_last_2: savedPhoneLast2,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            });

            // Native haptic feedback
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate([80, 40, 80]);
              } catch {}
            }

            setPortalData(res);
            setShowCelebrationModal(true);
          } catch (err: any) {
            setCheckInError(err.message || 'Check-in failed. Please verify location.');
          } finally {
            setIsCheckingIn(false);
          }
        },
        (geoErr) => {
          setIsCheckingIn(false);
          console.warn('Geolocation error:', geoErr);
          setCheckInError(
            '📍 Location permission is required to verify you are inside Muscle Hunt. Please enable GPS on your phone.'
          );
        },
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 }
      );
    } else {
      setCheckInError('Geolocation is not supported by your mobile browser.');
    }
  };

  const handleSwitchMember = () => {
    setPortalData(null);
    setCheckInError('');
    setShowCelebrationModal(false);
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gym_member_code');
      localStorage.removeItem('gym_phone_last_2');
    }
    setSavedMemberCode('');
    setSavedPhoneLast2('');
    setPortalData(null);
    setCheckInError('');
    setShowCelebrationModal(false);
  };

  return (
    <div className={`${styles.portalRoot} ${theme === 'dark' ? styles.themeDark : styles.themeLight}`}>
      <main className={styles.mobileShell}>
        {/* Top Header */}
        <header className={styles.topHeader}>
          <div className={styles.brandGroup}>
            <button
              type="button"
              className={styles.hamburgerBtn}
              aria-label="Navigation Menu"
              onClick={() => {
                if (portalData) {
                  setActiveTab((prev) => (prev === 'profile' ? 'home' : 'profile'));
                }
              }}
            >
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
              <span className={styles.hamburgerLine} />
            </button>
            <h1 className={styles.headerBrandTitle}>MUSCLE HUNT</h1>
          </div>

          <div className={styles.headerControls}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.themeToggleBtn}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* Dynamic Screen View */}
        {!portalData ? (
          /* Screen 1: Login / Enter Gym Portal */
          <PortalLogin
            theme={theme}
            onLogin={handleLogin}
            isLoading={isLoggingIn}
            errorMessage={loginError}
            initialMemberCode={savedMemberCode}
            initialPhoneLast2={savedPhoneLast2}
          />
        ) : (
          /* Logged In Experience with Bottom Navigation */
          <>
            {activeTab === 'home' && (
              /* Screen 2: Member Home Dashboard */
              <PortalDashboard
                data={portalData}
                onCheckIn={handleCheckIn}
                isCheckingIn={isCheckingIn}
                checkInError={checkInError}
              />
            )}

            {activeTab === 'calendar' && (
              /* Screen 4: Monthly Attendance Calendar */
              <PortalCalendar data={portalData} />
            )}

            {activeTab === 'profile' && (
              /* Screen 5: Member Profile & Payment Details */
              <PortalProfile
                data={portalData}
                onSwitchMember={handleSwitchMember}
                onSignOut={handleSignOut}
              />
            )}

            {/* Bottom Sticky Navigation */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
          </>
        )}

        {/* Screen 3: Workout Recorded Celebration Modal */}
        {showCelebrationModal && portalData && (
          <CelebrationModal
            theme={theme}
            streakCount={portalData.streak.current_streak}
            fullName={portalData.full_name}
            onClose={() => setShowCelebrationModal(false)}
          />
        )}
      </main>
    </div>
  );
}
