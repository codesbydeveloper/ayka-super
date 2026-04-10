"use client";
import React, { useEffect, useState } from 'react';
import { Search, Bell, HelpCircle, ChevronDown, User, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './Header.module.css';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem('user_data');
    if (data) {
      try {
        setUserData(JSON.parse(data));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Global search is coming soon.");
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuToggle} onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search..." 
            className={styles.searchInput}
          />
        </form>
      </div>

      <div className={styles.rightSection}>
        <button className={styles.iconButton} title="Help Center" onClick={() => alert("AYKA Central Support: contact@aykacare.com")}>
          <HelpCircle size={20} />
        </button>
        <button className={styles.iconButton} title="Notifications" onClick={() => router.push('/notifications')}>
          <Bell size={20} />
          <span className={styles.notificationBadge}>3</span>
        </button>

        <div className={styles.divider}></div>

        <div className={styles.adminProfile}>
          <div className={styles.adminAvatar}>
            <User size={18} color="var(--text-muted)" />
          </div>
          <div className={styles.adminInfo}>
            <span className={styles.adminName}>{userData?.name || 'Admin'}</span>
            <span className={styles.adminEmail}>{userData?.email || 'admin@ayka.com'}</span>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" className={styles.profileChevron} />
        </div>
      </div>
    </header>
  );
}

