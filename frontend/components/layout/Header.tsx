'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './layout.module.css';
import { api } from '@/lib/api';
import { Member, Admin } from '@/lib/types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuToggle: () => void;
  admin: Admin | null;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, admin }) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          className={styles.mobileMenuBtn}
          onClick={onMenuToggle}
          aria-label="Toggle Navigation"
        >
          ☰
        </button>

        <div className={styles.searchContainer} ref={dropdownRef}>
          <div className={styles.searchBar}>
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by Member ID, Name, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true);
              }}
              className={styles.searchInput}
            />
            {isSearching && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>...</span>}
          </div>

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
      </div>

      <div className={styles.headerRight}>
        <div className={styles.coachBadge}>
          <Avatar name={admin?.username || 'Coach'} size="sm" />
          <div className={styles.coachInfo}>
            <span className={styles.coachName}>{admin?.username || 'Coach'}</span>
            <span className={styles.coachRole}>Administrator</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={handleLogout} title="Log out">
          Sign out
        </Button>
      </div>
    </header>
  );
};
