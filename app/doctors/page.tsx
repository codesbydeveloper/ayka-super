"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Eye,
  Loader2,
  Lock,
  Clock,
  Zap,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/utils/api';
import '../dashboard/Dashboard.css';
import './Doctors.css';

const LIST_SKIP = 0;
const LIST_LIMIT = 50;

function extractDoctorsList(result: Record<string, unknown>): unknown[] {
  const data = result.data as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).doctors)) {
    return (data as Record<string, unknown>).doctors as unknown[];
  }
  if (Array.isArray(result.doctors)) return result.doctors as unknown[];
  return [];
}

function normalizeDoctorRow(raw: Record<string, unknown>) {
  const name = String(raw.name ?? raw.full_name ?? '—');
  const email = String(raw.email ?? '');
  /* API uses British spelling `specialisation`; keep US variants too. */
  const specialization = String(
    raw.specialisation ??
      raw.specialization ??
      raw.speciality ??
      raw.specialty ??
      '—',
  );
  const sub = (raw.subscription as Record<string, unknown>) || {};
  const plan = String(
    sub.plan ?? raw.subscription_plan ?? raw.plan_name ?? '—',
  );
  const expiryRaw =
    sub.expiry_date ??
    raw.subscription_expiry ??
    raw.plan_expires_at ??
    raw.expiry_date;
  let expiry_date = '';
  let days_left = 0;
  if (expiryRaw) {
    const exp = new Date(String(expiryRaw));
    if (!Number.isNaN(exp.getTime())) {
      expiry_date = exp.toISOString().split('T')[0];
      days_left = Math.ceil(
        (exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      );
    }
  }
  return {
    id: raw.id,
    name,
    email,
    specialization,
    phone_number: String(raw.phone_number ?? raw.phone ?? ''),
    clinic_name: String(raw.clinic_name ?? ''),
    subscription: {
      plan,
      expiry_date,
      days_left: Math.max(0, days_left),
    },
    is_active: raw.is_active !== false,
  };
}

export default function DoctorsPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = useCallback(async () => {
    setLoading(true);
    try {
      const userType =
        typeof window !== 'undefined' ? localStorage.getItem('user_type') : null;
      const basePath =
        userType === 'admin_staff'
          ? '/api/v1/admin-staff/doctors'
          : '/api/v1/super-admin/doctors';

      const params = new URLSearchParams({
        skip: String(LIST_SKIP),
        limit: String(LIST_LIMIT),
      });

      const result = (await api.get(
        `${basePath}?${params}`,
      )) as Record<string, unknown>;
      const rows = extractDoctorsList(result).map((d) =>
        normalizeDoctorRow(d as Record<string, unknown>),
      );
      setDoctors(rows);
    } catch (err: unknown) {
      console.error('Fetch experts error:', err);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const getExpiryBadgeClass = (days: number) => {
    if (days <= 3) return 'expiry-critical'; // Red
    if (days <= 7) return 'expiry-warning';  // Orange
    if (days <= 15) return 'expiry-approaching'; // Yellow
    return 'expiry-safe'; // Green
  };

  return (
    <div className="page-container doctors-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expert Management</h1>
          <p className="page-subtitle">Track and manage medical experts with active platform subscriptions.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
           <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#f59e0b" />
              <span>Renewals Due</span>
           </button>
           <button className="btn btn-primary" onClick={() => router.push('/doctors/new')} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <Plus size={18} />
             <span>Add Expert</span>
           </button>
        </div>
      </div>

      {/* Subscription Pipeline Horizontal Summary */}
      <div className="subscription-summary-row">
         <div className="summary-card critical">
            <div className="summary-info">
               <span className="summary-label">Expires in 3 Days</span>
               <h3 className="summary-value">12 Experts</h3>
            </div>
            <div className="summary-tag">Action Priority</div>
         </div>
         <div className="summary-card warning">
            <div className="summary-info">
               <span className="summary-label">Expires in 7 Days</span>
               <h3 className="summary-value">45 Experts</h3>
            </div>
            <div className="summary-tag">Follow-up Required</div>
         </div>
         <div className="summary-card approach">
            <div className="summary-info">
               <span className="summary-label">Expires in 15 Days</span>
               <h3 className="summary-value">89 Experts</h3>
            </div>
            <div className="summary-tag">Pipeline Safe</div>
         </div>
      </div>

      <div className="card elite-table-card">
        <div className="table-wrapper">
          <table className="elite-table">
            <thead>
              <tr>
                <th>Expert Identity</th>
                <th>Specialization</th>
                <th>Subscription Plan</th>
                <th>Expiry Protocol</th>
                <th style={{ textAlign: 'right' }}>Management</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px' }}><Loader2 className="animate-spin" /></td></tr>
              ) : doctors.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    <div className="doctor-profile-cell">
                       <div className="doctor-avatar-circle" aria-hidden>
                         {(doc.name || '?').trim().charAt(0).toUpperCase()}
                       </div>
                       <div className="doctor-main-info">
                         <span className="doctor-full-name" style={{ fontWeight: 700, display: 'block' }}>{doc.name}</span>
                         <span className="doctor-secondary-id" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{doc.email}</span>
                       </div>
                    </div>
                  </td>
                  <td><span className="specialization-pill" style={{ background: '#EEF2FF', color: '#4F46E5', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700 }}>{doc.specialization}</span></td>
                  <td>
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{doc.subscription.plan}</span>
                        <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>Active Auto-Renew</span>
                     </div>
                  </td>
                  <td>
                     <div className={`expiry-badge ${getExpiryBadgeClass(doc.subscription.days_left)}`}>
                        <Clock size={14} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span style={{ fontWeight: 800 }}>{doc.subscription.days_left} Days Left</span>
                           <span style={{ fontSize: '10px', opacity: 0.8 }}>Expires: {doc.subscription.expiry_date}</span>
                        </div>
                     </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="actions-wrapper" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                       <Link href={`/doctors/details?id=${doc.id}`} className="btn-icon" title="View" aria-label="View expert">
                         <Eye size={18} />
                       </Link>
                       <Link
                         href={`/doctors/details?id=${doc.id}`}
                         className="btn-icon primary-btn"
                         title="Open profile"
                         aria-label="Chat / open profile"
                       >
                         <MessageSquare size={18} />
                       </Link>
                       <button type="button" className="btn-icon danger-btn" title="Suspend access" aria-label="Suspend access">
                         <Lock size={18} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
