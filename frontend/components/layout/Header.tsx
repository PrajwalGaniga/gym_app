'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './layout.module.css';
import { api } from '@/lib/api';
import { Member, Admin } from '@/lib/types';
import { Avatar } from '../ui/Avatar';

interface HeaderProps {
  onMenuToggle: () => void;
  admin: Admin | null;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, admin }) => {
  const router = useRouter();
  const [gymName, setGymName] = useState('IronPulse Fitness');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        if (s && s.gym_name) {
          setGymName(s.gym_name);
        }
      })
      .catch(() => {
        // use default fallback
      });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await api.searchMembers(searchQuery.trim(), 6);
        setSearchResults(results);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    }
    router.push('/login');
  };

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      return next;
    });
  };

  return (
    <>
      <header className={styles.header}>
        {/* Left Side: Brand and Mobile Sidebar Toggle */}
        <div className={styles.headerLeft}>
          <button
            className={styles.mobileMenuBtn}
            onClick={onMenuToggle}
            aria-label="Toggle Desktop Sidebar"
          >
            ☰
          </button>

          <Link href="/dashboard" className={styles.headerBrandLink}>
            <div className={styles.headerBrandIcon}>🏋️</div>
            <div className={styles.headerBrandText}>
              <span className={styles.headerBrandTitle}>{gymName}</span>
              <span className={styles.headerBrandGreeting}>
                Coach {admin?.username || 'Admin'}
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Desktop Search Bar */}
        <div className={styles.desktopSearchWrapper} ref={dropdownRef}>
          <div className={styles.searchBar}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search member ID, name, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true);
              }}
              className={styles.searchInput}
            />
            {isSearching && <span className={styles.searchSpinner}>...</span>}
          </div>

          {/* Autocomplete Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className={styles.searchResultsDropdown}>
              {searchResults.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className={styles.searchResultItem}
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar
                      src={member.photo?.thumbnail_url || member.photo?.url}
                      name={member.full_name}
                      size="sm"
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.full_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        ID: {member.member_code} • {member.phone}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>View →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Search Toggle, Settings Icon, and Coach Profile */}
        <div className={styles.headerRight}>
          {/* Mobile Search Toggle Icon */}
          <button
            type="button"
            className={styles.iconActionBtn}
            onClick={toggleMobileSearch}
            aria-label="Search members"
            title="Search members"
          >
            🔍
          </button>

          {/* Dedicated Settings Button in Top Header */}
          <Link
            href="/settings"
            className={styles.iconActionBtn}
            aria-label="Gym Settings"
            title="Gym & Coach Settings"
          >
            ⚙️
          </Link>

          {/* Coach Avatar & Popover Menu */}
          <div className={styles.userProfileWrapper} ref={userMenuRef}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-label="User profile menu"
            >
              <Avatar name={admin?.username || 'Coach'} size="sm" />
            </button>

            {isUserMenuOpen && (
              <div className={styles.userMenuDropdown}>
                <div className={styles.userMenuHeader}>
                  <div className={styles.userMenuName}>Coach {admin?.username || 'Admin'}</div>
                  <div className={styles.userMenuRole}>Facility Administrator</div>
                </div>
                <div className={styles.userMenuDivider} />
                <Link
                  href="/settings"
                  className={styles.userMenuItem}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  ⚙️ Settings & PIN
                </Link>
                <Link
                  href="/wallet"
                  className={styles.userMenuItem}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  💰 Wallet & Revenue
                </Link>
                <div className={styles.userMenuDivider} />
                <button
                  type="button"
                  className={`${styles.userMenuItem} ${styles.userMenuItemDanger}`}
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-Down Full Width Search Bar on Mobile */}
      {isMobileSearchOpen && (
        <div className={styles.mobileSearchOverlay}>
          <div className={styles.mobileSearchBarWrapper}>
            <span style={{ fontSize: '1.1rem' }}>🔍</span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search member ID, name, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.mobileSearchInput}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
            <button
              type="button"
              className={styles.closeSearchBtn}
              onClick={() => {
                setIsMobileSearchOpen(false);
                setSearchQuery('');
              }}
            >
              Cancel
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.mobileSearchResultsList}>
              {searchResults.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className={styles.mobileSearchResultRow}
                  onClick={() => {
                    setIsMobileSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <Avatar
                    src={member.photo?.thumbnail_url || member.photo?.url}
                    name={member.full_name}
                    size="sm"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                      {member.full_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      ID: {member.member_code} • 📞 {member.phone}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: '#2563eb', fontWeight: 500 }}>
                    View →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
