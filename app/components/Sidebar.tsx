"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Hospital, 
  CreditCard, 
  Users, 
  Settings, 
  Bell, 
  BarChart3,
  LogOut,
  Package,
  Stethoscope, 
  Activity,
  FileText,
  UserPlus,
  Building,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { api } from '@/utils/api';

const menuItems = [
  { name: 'Dashboard', icon: <LayoutDashboard size={18} />, href: '/dashboard' },
  { name: 'Clinic Management', icon: <Hospital size={18} />, href: '/clinics' },
  { name: 'Expert Management', icon: <Stethoscope size={18} />, href: '/doctors' },
  { name: 'Clinic Leads', icon: <Building size={18} />, href: '/leads/clinics' },
  { name: 'Expert Leads', icon: <UserPlus size={18} />, href: '/leads/doctors' },
  { name: 'Patient Management', icon: <Users size={18} />, href: '/patients' },
  { name: 'Subscription & Plans', icon: <Package size={18} />, href: '/subscriptions' },
  { name: 'Billing & Revenue', icon: <CreditCard size={18} />, href: '/billing' },
  { name: 'Staff Management', icon: <Users size={18} />, href: '/staff' },
  { name: 'Platform Reports', icon: <FileText size={18} />, href: '/reports' },
  { name: 'Activity Logs', icon: <BarChart3 size={18} />, href: '/analytics' },
  { name: 'System Settings', icon: <Settings size={18} />, href: '/settings' },
  { name: 'Notifications', icon: <Bell size={18} />, href: '/notifications' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [userData, setUserData] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Initializing state from localStorage for persistent user preference
    const savedState = localStorage.getItem('sidebar_collapsed');
    if (savedState === 'true') {
      setIsCollapsed(true);
      document.documentElement.style.setProperty('--sidebar-width', '80px');
    }

    const data = localStorage.getItem('user_data');
    if (data) {
      try {
        setUserData(JSON.parse(data));
      } catch (e) {
        console.error('Failed to parse user data');
      }
    }
  }, []);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar_collapsed', newState.toString());
    document.documentElement.style.setProperty('--sidebar-width', newState ? '80px' : '260px');
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/v1/auth/logout', {});
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'A';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.logoContainer}>
        <div style={{ background: 'var(--primary)', color: 'white', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '32px' }}>
          <BarChart3 size={20} />
        </div>
        {!isCollapsed && <span className={styles.logoTitle}>AYKA Central</span>}
        <button className={styles.collapseToggle} onClick={toggleCollapse}>
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className={styles.navSection}>
        {menuItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              title={isCollapsed ? item.name : ''}
            >
              {item.icon}
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <div className={styles.profileInfo}>
          <div className={styles.avatar}>{getInitials(userData?.name)}</div>
          {!isCollapsed && (
            <div className={styles.profileDetails}>
              <span className={styles.userName}>{userData?.name || 'Administrator'}</span>
              <span className={styles.userRole}>Super Admin</span>
            </div>
          )}
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

