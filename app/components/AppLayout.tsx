"use client";
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Menu, X } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // High-performance normalization for routing state
  const isLoginPage = pathname === '/login' || pathname === '/login/';
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // If we are on the login page, we immediately bypass the handshake
    if (isLoginPage) {
      setIsAuthChecking(false);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const userType = typeof window !== 'undefined' ? localStorage.getItem('user_type') : null;
    
    // Multi-tier security: Check token existence AND authorized identity
    const isAuthorized = userType === 'super-admin' || userType === 'superadmin' || userType === 'super_admin' || userType === 'admin_staff' || userType === 'admin';

    const goLogin = (path: string) => {
      // Defer until after App Router is ready (avoids "Router action dispatched before initialization")
      queueMicrotask(() => {
        router.replace(path);
      });
    };

    if (!token) {
      goLogin('/login');
    } else if (!isAuthorized) {
      // Quarantine unauthorized roles (e.g. clinic owners/doctors trying to access Central)
      console.warn('Ayka Security: Unauthorized directory access attempt.', { userType });
      localStorage.clear();
      goLogin('/login?error=unauthorized_access');
    } else {
      setIsAuthChecking(false);
    }
  }, [isLoginPage, router]);

  // Close sidebar on navigation change (Critical for mobile UX)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (isAuthChecking && !isLoginPage) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--background, #ffffff)' }}>
        <div style={{ padding: '32px', background: 'white', borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '320px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: '56px', height: '56px', marginBottom: '20px' }}>
             <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--border)', borderRadius: '50%' }}></div>
             <div style={{ position: 'absolute', inset: 0, border: '4px solid transparent', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite' }}></div>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>Security Handshake</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>Verifying your administrative credentials with AYKA Central servers...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 17, 26, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar - Controlled by State */}
      <div 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 1000,
          height: '100vh',
          background: 'var(--sidebar-bg, #ffffff)',
          transform: `translateX(${isSidebarOpen ? '0' : '-100%'})`,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="sidebar-wrapper"
      >
        <style>{`
          @media (min-width: 1025px) {
            .sidebar-wrapper {
              position: sticky !important;
              top: 0;
              height: 100vh;
              transform: translateX(0) !important;
            }
          }
        `}</style>
        <Sidebar />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--background, #ffffff)' }}>
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="page-main-content">
          <style>{`
            .page-main-content {
              flex: 1;
              width: 100%;
              min-width: 0;
              overflow-x: clip;
              padding-bottom: env(safe-area-inset-bottom, 0px);
            }
            @media (max-width: 1024px) {
              .page-main-content {
                padding-bottom: max(40px, env(safe-area-inset-bottom, 0px));
              }
            }
          `}</style>
          {children}
        </main>
      </div>
    </div>
  );
}

