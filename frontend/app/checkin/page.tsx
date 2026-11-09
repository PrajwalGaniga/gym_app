'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

/**
 * Returns today's ISO date string ("YYYY-MM-DD") in the gym's configured timezone (Asia/Kolkata).
 */
function getGymTodayIsoString(timezone = 'Asia/Kolkata'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
}

export default function MemberPortalPage() {
  const [theme, setTheme] = useState<PortalTheme>('dark');
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [gymInfo, setGymInfo] = useState<PortalGymInfo | null>(null);

  const [savedMemberCode, setSavedMemberCode] = useState('');
  const [savedPhoneLast2, setSavedPhoneLast2] = useState('');
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(true);
  const [isSwitchingMember, setIsSwitchingMember] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [checkInError, setCheckInError] = useState('');

  const [portalData, setPortalData] = useState<PortalCheckInResponse | null>(null);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // References for silent refresh
  const memberCodeRef = useRef('');
  const phoneLast2Ref = useRef('');
  memberCodeRef.current = savedMemberCode;
  phoneLast2Ref.current = savedPhoneLast2;

  // 1. Initial Load: Retrieve theme & auto-login remembered member
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

      if (storedCode && storedPhone) {
        setSavedMemberCode(storedCode);
        setSavedPhoneLast2(storedPhone);

        // Auto-login remembered member directly to home dashboard!
        api
          .portalLogin({
            member_code: storedCode,
            phone_last_2: storedPhone,
          })
          .then((res) => {
            setPortalData(res);
            setActiveTab('home');
          })
          .catch((err) => {
            console.warn('Auto-login session expired or invalid:', err);
            if (err instanceof ApiError && err.status === 401) {
              localStorage.removeItem('gym_member_code');
              localStorage.removeItem('gym_phone_last_2');
              setSavedMemberCode('');
              setSavedPhoneLast2('');
            }
          })
          .finally(() => {
            setIsAutoLoggingIn(false);
          });
      } else {
        setIsAutoLoggingIn(false);
      }
    } else {
      setIsAutoLoggingIn(false);
    }

    api
      .getPortalGymInfo()
      .then((info) => setGymInfo(info))
      .catch((err) => console.error('Failed to load gym info:', err));
  }, []);

  // 2. Midnight Rollover & Day Transition Watcher
  // When night passes 12:00 AM (in Asia/Kolkata), automatically resets the check-in button for the new day
  const refreshMemberDataSilently = useCallback(async () => {
    const code = memberCodeRef.current;
    const phone = phoneLast2Ref.current;
    if (!code || !phone) return;

    try {
      const fresh = await api.portalLogin({
        member_code: code,
        phone_last_2: phone,
      });
      setPortalData(fresh);
    } catch (err) {
      console.warn('Silent midnight refresh error:', err);
    }
  }, []);

  useEffect(() => {
    if (!portalData || !savedMemberCode || !savedPhoneLast2) return;

    const checkMidnightRollover = () => {
      const todayIso = getGymTodayIsoString();
      // If portal data was recorded on previous date, trigger silent refresh for today
      if (portalData.check_in_date && portalData.check_in_date !== todayIso) {
        refreshMemberDataSilently();
      }
    };

    // Check when user unlocks phone or returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkMidnightRollover();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkMidnightRollover);

    // Periodic check every 60 seconds across midnight
    const intervalId = setInterval(checkMidnightRollover, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkMidnightRollover);
      clearInterval(intervalId);
    };
  }, [portalData, savedMemberCode, savedPhoneLast2, refreshMemberDataSilently]);

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
      setIsSwitchingMember(false);
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

  // Allows checking in another member on the same device
  const handleSwitchMember = () => {
    setIsSwitchingMember(true);
    setCheckInError('');
    setShowCelebrationModal(false);
  };

  // Completely signs out and clears credentials
  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gym_member_code');
      localStorage.removeItem('gym_phone_last_2');
    }
    setSavedMemberCode('');
    setSavedPhoneLast2('');
    setPortalData(null);
    setIsSwitchingMember(false);
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
                if (portalData && !isSwitchingMember) {
                  setActiveTab((prev) => (prev === 'profile' ? 'home' : 'profile'));
                } else if (isSwitchingMember) {
                  setIsSwitchingMember(false);
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
        {isAutoLoggingIn ? (
          /* High-Speed Auto-Login Splash */
          <div className={styles.autoLoginCard}>
            <img
              src={theme === 'dark' ? '/assets/hero-full-dark.png' : '/assets/hero-full-light.png'}
              alt="Muscle Hunt"
              className={styles.autoLoginHero}
            />
            <div className={styles.autoLoginSpinnerGroup}>
              <div className={styles.autoLoginTitle}>⚡ LOADING MUSCLE HUNT QUEST...</div>
              <div className={styles.autoLoginProgressBar}>
                <div className={styles.autoLoginProgressFill} />
              </div>
            </div>
          </div>
        ) : !portalData || isSwitchingMember ? (
          /* Screen 1: Login / Enter Gym Portal */
          <PortalLogin
            theme={theme}
            onLogin={handleLogin}
            isLoading={isLoggingIn}
            errorMessage={loginError}
            initialMemberCode={isSwitchingMember ? '' : savedMemberCode}
            initialPhoneLast2={isSwitchingMember ? '' : savedPhoneLast2}
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
