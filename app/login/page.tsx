"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/utils/api';
import { 
  BarChart3, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Users, 
  ShieldCheck,
  Loader2
} from 'lucide-react';
import './Login.css';

/** Set NEXT_PUBLIC_ENABLE_MOCK_LOGIN=true for offline UI only (fake token). */
const MOCK_EMAIL = 'admin@gmail.com';
const MOCK_PASSWORD = '123456';

function isMockLoginEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('access_token');
    const userType = localStorage.getItem('user_type');
    const authorized =
      userType === 'super-admin' ||
      userType === 'superadmin' ||
      userType === 'super_admin' ||
      userType === 'admin_staff' ||
      userType === 'admin';
    if (token && authorized) {
      router.replace("/dashboard");
      return;
    }

    if (window.location.search.includes('unauthorized_access')) {
      setError('Access Denied: Your account role is not authorized for AYKA Central.');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (isMockLoginEnabled()) {
      const email = identifier.trim().toLowerCase();
      if (email !== MOCK_EMAIL || password !== MOCK_PASSWORD) {
        setError('Invalid credentials. For UI preview use admin@gmail.com / 123456.');
        setLoading(false);
        return;
      }
      localStorage.setItem('access_token', 'dev-mock-access-token');
      localStorage.setItem('refresh_token', 'dev-mock-refresh-token');
      localStorage.setItem('user_type', 'super-admin');
      localStorage.setItem(
        'user_data',
        JSON.stringify({
          name: 'Admin',
          email: MOCK_EMAIL,
        }),
      );
      router.replace('/dashboard');
      setLoading(false);
      return;
    }

    try {
      const result = await api.post('/api/v1/auth/login', {
        identifier: identifier.trim(),
        password,
        keep_signed_in: keepSignedIn,
      });

      if (result.success === false) {
        setError(
          typeof result.message === 'string'
            ? result.message
            : 'Login failed. Please check your credentials.',
        );
        return;
      }

      const data = (result.data ?? {}) as Record<string, unknown>;
      const nestedUser = data.user as { user_type?: string } | undefined;
      const accessToken =
        (typeof data.access_token === 'string' && data.access_token) ||
        (typeof result.access_token === 'string' && result.access_token) ||
        '';
      const refreshToken =
        (typeof data.refresh_token === 'string' && data.refresh_token) ||
        (typeof result.refresh_token === 'string' && result.refresh_token) ||
        '';
      const userType =
        (typeof data.user_type === 'string' && data.user_type) ||
        (typeof result.user_type === 'string' && result.user_type) ||
        (nestedUser && typeof nestedUser.user_type === 'string'
          ? nestedUser.user_type
          : null) ||
        'unauthorized';
      const userObject = data.user ?? result.user;

      if (!accessToken) {
        setError(
          typeof result.message === 'string' && result.message
            ? result.message
            : 'Login succeeded but no access token was returned.',
        );
        return;
      }

      console.log('Ayka Login Success:', { userType, foundToken: !!accessToken });

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('user_type', userType);
      localStorage.setItem('user_data', JSON.stringify(userObject ?? null));

      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'An error occurred during login. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
     
        <div className="login-branding">
          <div className="branding-content">
            <div className="logo-section">
              <div className="logo-icon-large" aria-hidden>
                <BarChart3 size={26} strokeWidth={2.25} />
              </div>
              <h1 className="logo-text">AYKA Central</h1>
            </div>
            
            <h2 className="branding-title">Master Control for your Medical SaaS.</h2>
            <p className="branding-subtitle">Manage clinics, monitor global revenue, and optimize platform performance from a single unified workspace.</p>
            
            <div className="benefit-list">
               <div className="benefit-item">
                  <div className="benefit-icon"><Zap size={18} /></div>
                  <div className="benefit-text">
                     <strong>Instant Deployment</strong>
                     <span>Push updates to all 1,200+ clinics in seconds.</span>
                  </div>
               </div>
               <div className="benefit-item">
                  <div className="benefit-icon"><ShieldCheck size={18} /></div>
                  <div className="benefit-text">
                     <strong>Unified Security</strong>
                     <span>Enterprise-grade authentication with JWT & RBAC.</span>
                  </div>
               </div>
               <div className="benefit-item">
                  <div className="benefit-icon"><Users size={18} /></div>
                  <div className="benefit-text">
                     <strong>Multi-Role Login</strong>
                     <span>One portal for owners, doctors, and staff.</span>
                  </div>
               </div>
            </div>

            <div className="branding-footer">
               <div className="trust-badges">
                  <span className="badge-item"><CheckCircle2 size={14} /> ISO 27001 Certified</span>
                  <span className="badge-item"><CheckCircle2 size={14} /> HIPAA Compliant</span>
               </div>
            </div>
          </div>
        </div>


          <div className="login-form-area">
            <div className="form-card">
              <div className="form-header">
                <h3>Welcome Back</h3>
                <p>Log in to access your admin dashboard</p>
              </div>

              {error && (
                <div className="error-alert">
                  <span>{error}</span>
                </div>
              )}

              <form className="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email or Phone Number</label>
                  <div className="input-container">
                    <Mail className="input-icon" size={18} />
                    <input 
                      type="text" 
                      className="form-input-login" 
                      placeholder="Enter email or 10-digit mobile" 
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div className="label-row">
                    <label className="form-label">Password</label>
                    <a href="#" className="forgot-password">Forgot?</a>
                  </div>
                  <div className="input-container">
                    <Lock className="input-icon" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      className="form-input-login" 
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-options">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      className="custom-checkbox" 
                      checked={keepSignedIn}
                      onChange={(e) => setKeepSignedIn(e.target.checked)}
                    />
                    <span>Keep me signed in</span>
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Dashboard</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <div className="form-footer">
                <p>Powered by AYKA Systems Enterprise V4.0.2</p>
              </div>
            </div>
          </div>
        </div>
    </div>
    );
  }
