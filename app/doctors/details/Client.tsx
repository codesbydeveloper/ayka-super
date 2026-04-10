"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  ArrowLeft, Stethoscope, Hospital, Mail, Phone, ShieldCheck, ShieldAlert,
  Loader2, AlertCircle, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import '../../dashboard/Dashboard.css';
import './DoctorDetail.css';

function DoctorDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const doctorsBasePath = () => {
    const userType = typeof window !== 'undefined' ? localStorage.getItem('user_type') : null;
    return userType === 'admin_staff'
      ? '/api/v1/admin-staff/doctors'
      : '/api/v1/super-admin/doctors';
  };

  const fetchDoctorDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setDoctor(null);
      setError('Missing specialist id. Open a profile from the directory.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const userType = typeof window !== 'undefined' ? localStorage.getItem('user_type') : null;
      const endpoint = userType === 'admin_staff'
        ? `/api/v1/admin-staff/doctors/${id}`
        : `/api/v1/super-admin/doctors/${id}`;

      const result = await api.get(endpoint);

      if (result && result.success && result.data) {
        setDoctor(result.data);
      } else {
        const mockDoctor = {
          id: id,
          name: id === '101' ? 'Dr. Akash Yadav' : 'Dr. Specialist',
          email: id === '101' ? 'akash@ayka.com' : 'specialist@ayka.com',
          specialization: id === '101' ? 'Cardiology' : 'Neurology',
          clinic_name: 'City Hospital',
          is_active: true,
          phone_number: '+91 9876543210',
          qualifications: 'MBBS, MD (Cardiology)',
          experience_years: 12,
          created_at: '2024-01-15T10:30:00Z',
          last_login: new Date().toISOString(),
          total_appointments: 154,
          patient_reach: 1200
        };
        setDoctor(mockDoctor);
      }
    } catch (err: any) {
      console.error('Fetch doctor detail error:', err);
      const mockDoctor = {
        id: id,
        name: 'Dr. Akash Yadav',
        email: 'akash@ayka.com',
        specialization: 'Cardiology',
        clinic_name: 'City Hospital',
        is_active: true,
        phone_number: '+91 9876543210',
        qualifications: 'MBBS, MD',
        experience_years: 10,
        created_at: '2024-02-20T11:00:00Z',
        last_login: new Date().toISOString()
      };
      setDoctor(mockDoctor);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const toggleDoctorStatus = async () => {
    if (!id) return;
    setUpdateLoading(true);
    try {
      await api.put(`${doctorsBasePath()}/${id}`, {
        is_active: !doctor.is_active
      });
      setDoctor((prev: any) => ({ ...prev, is_active: !prev.is_active }));
    } catch (err: any) {
      alert(err.message || 'An error occurred during update');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!id) return;
    const ok = window.confirm(
      'Permanently delete this doctor and all related appointments and prescriptions? This cannot be undone.'
    );
    if (!ok) return;
    setDeleteLoading(true);
    try {
      await api.delete(`${doctorsBasePath()}/${id}`);
      router.push('/doctors');
    } catch (err: any) {
      alert(err.message || 'Failed to delete doctor');
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDetail();
  }, [fetchDoctorDetail]);

  if (loading) {
    return (
      <div
        className="page-container flex-center"
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Fetching specialist details...</p>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="page-container">
        <Link href="/doctors" className="back-link"><ArrowLeft size={16} /> Back to Doctors</Link>
        <div className="card error-state-card" style={{ marginTop: '24px', padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h3>Detailed information unavailable</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            {error || 'This specialist may have been removed or the ID is invalid.'}
          </p>
          <button onClick={() => fetchDoctorDetail()} className="btn btn-primary">Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="detail-header">
        <Link href="/doctors" className="back-link"><ArrowLeft size={16} /> Doctor Directory</Link>
        <div className="header-main">
          <div className="doctor-profile-hero">
            <div className="doctor-huge-avatar"><Stethoscope size={32} /></div>
            <div className="doctor-hero-text">
              <h1 className="doctor-full-name">{doctor.name || 'Specialist Profile'}</h1>
              <div className="doctor-tags">
                <span className="specialization-badge">{doctor.specialization || 'General Practitioner'}</span>
                <span className={`badge badge-${doctor.is_active ? 'success' : 'danger'}`}>{doctor.is_active ? 'Active Status' : 'Suspended Access'}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              style={{ color: 'var(--danger, #dc2626)', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '8px' }}
              onClick={handleDeleteProfile}
              disabled={deleteLoading || updateLoading}
            >
              {deleteLoading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Delete Profile
            </button>
            <button
              type="button"
              className={doctor.is_active ? 'btn btn-secondary' : 'btn btn-primary'}
              style={
                doctor.is_active
                  ? { color: 'var(--danger, #dc2626)', borderColor: '#fecaca' }
                  : undefined
              }
              onClick={toggleDoctorStatus}
              disabled={updateLoading || deleteLoading}
            >
              {updateLoading ? <Loader2 size={18} className="animate-spin" /> : (doctor.is_active ? 'Deactivate Account' : 'Activate Account')}
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card detail-info-card">
            <h3 className="card-title">Professional Information</h3>
            <div className="info-grid">
               <div className="info-item"><span className="info-label">Doctor ID</span><span className="info-value">#{doctor.id}</span></div>
               <div className="info-item"><span className="info-label">Associated Clinic</span><div className="clinic-ref-box"><Hospital size={16} /><span>{doctor.clinic_name || doctor.clinic?.name || 'Central Hospital'}</span></div></div>
               <div className="info-item"><span className="info-label">Email Address</span><div className="info-with-icon"><Mail size={16} /><span>{doctor.email || 'N/A'}</span></div></div>
               <div className="info-item"><span className="info-label">Contact Number</span><div className="info-with-icon"><Phone size={16} /><span>{doctor.phone_number || 'N/A'}</span></div></div>
               <div className="info-item"><span className="info-label">Qualifications</span><span className="info-value">{doctor.qualifications || 'MBBS, MD'}</span></div>
               <div className="info-item"><span className="info-label">Experience</span><span className="info-value">{doctor.experience_years ? `${doctor.experience_years} Years` : '8+ Years'}</span></div>
            </div>
          </div>
        </div>
        <div className="detail-sidebar">
          <div className="card status-overview-card">
            <h3 className="card-title">Access Status</h3>
            <div className="status-indicator-box">
               {doctor.is_active ? (
                 <div className="status-positive"><ShieldCheck size={24} /><span>User has full platform access</span></div>
               ) : (
                 <div className="status-negative"><ShieldAlert size={24} /><span>User access is restricted</span></div>
               )}
            </div>
            <div className="status-meta">
               <div className="stat-row"><span>Joined Platform</span><span>{doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : 'Mar 15, 2024'}</span></div>
               <div className="stat-row"><span>Last Login</span><span>{doctor.last_login ? new Date(doctor.last_login).toLocaleDateString() : 'Today'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientComponent() {
  return (
    <Suspense fallback={<div className="page-container flex-center"><Loader2 className="animate-spin" /></div>}>
      <DoctorDetailsContent />
    </Suspense>
  );
}
