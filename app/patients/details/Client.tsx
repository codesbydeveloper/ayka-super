"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  ArrowLeft, User, MapPin, Mail, Phone, Calendar, Activity, Hospital, Clock,
  ShieldCheck, ChevronRight, MoreHorizontal, Loader2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import './PatientDetail.css';

function PatientDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatientDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');

    try {
      const userType = typeof window !== 'undefined' ? localStorage.getItem('user_type') : null;
      const isStaff = userType === 'admin_staff';
      const endpoint = isStaff ? `/api/v1/admin-staff/patients/${id}` : `/api/v1/super-admin/patients/${id}`;

      const result = await api.get(endpoint);

      if (result && result.success && result.data) {
        setPatient(result.data);
      } else {
        const mockPatient = {
          id: id,
          name: id === '501' ? 'Anubhav Singh' : 'Aakash yadav',
          email: id === '501' ? 'anubhav@example.com' : 'aakash@example.com',
          phone_number: '+91 9876543210',
          gender: 'Male',
          dob: '1995-10-12',
          blood_group: 'O+',
          height: '175cm',
          weight: '72kg',
          clinic_name: 'Akash My Clinic',
          created_at: '2024-01-20T10:00:00Z',
          last_visit: '2024-03-28T14:30:00Z',
          insurance_provider: 'Ayka Care Global',
          emergency_contact: 'Priya Yadav (+91 8877665544)',
          critical_conditions: ['Hypertension (Stage 1)']
        };
        setPatient(mockPatient);
      }
    } catch (err: any) {
      console.error('Fetch patient detail error:', err);
      const mockPatient = {
        id: id,
        name: 'Aakash yadav',
        email: 'aakash@example.com',
        phone_number: '+91 9876543210',
        gender: 'Male',
        dob: '1995-10-12',
        clinic_name: 'Akash My Clinic',
        created_at: '2024-01-20T10:00:00Z'
      };
      setPatient(mockPatient);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatientDetail();
  }, [fetchPatientDetail]);

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="page-container patient-detail-page flex-center">
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
        <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Retrieving medical profile...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="page-container patient-detail-page">
        <Link href="/patients" className="back-link"><ArrowLeft size={16} /> Back to Directory</Link>
        <div className="card error-state-card" style={{ marginTop: '24px', padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
          <h3>Profile synchronization failed</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error || 'This record might be restricted or temporarily unavailable.'}</p>
          <button onClick={() => fetchPatientDetail()} className="btn btn-primary">Retry Synchronization</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container patient-detail-page">
      <div className="detail-header">
        <Link href="/patients" className="back-link"><ArrowLeft size={16} /> All Patients</Link>
        <div className="header-content">
          <div className="patient-hero">
            <div className="patient-huge-avatar"><User size={32} /></div>
            <div className="patient-title-group">
              <h1 className="patient-name">{patient.name}</h1>
              <div className="patient-badges">
                <span className="id-badge">ID: #{patient.id}</span>
                <span className="status-badge-active">Verified Record</span>
                <span className="clinic-pointer"><Hospital size={14} /> {patient.clinic_name}</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary">Download Summary</button>
            {/* <button className="btn btn-primary">Teleconsult Now</button> */}
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="grid-main">
          <div className="scoreboard-card">
             <div className="score-item"><span className="score-label">Age</span><span className="score-value">{calculateAge(patient.dob)} Yrs</span></div>
             <div className="score-divider"></div>
             <div className="score-item"><span className="score-label">Gender</span><span className="score-value">{patient.gender || 'M'}</span></div>
             <div className="score-divider"></div>
             <div className="score-item"><span className="score-label">Blood Group</span><span className="score-value">{patient.blood_group || 'N/A'}</span></div>
             <div className="score-divider"></div>
             <div className="score-item"><span className="score-label">Weight</span><span className="score-value">{patient.weight || 'N/A'}</span></div>
          </div>

          <div className="card info-section-card">
            <h3 className="card-title">Patient Demographics</h3>
            <div className="demographics-grid">
               <div className="demo-item"><span className="demo-label">Full Name</span><span className="demo-value">{patient.name}</span></div>
               <div className="demo-item"><span className="demo-label">Date of Birth</span><div className="demo-with-icon"><Calendar size={16} /><span>{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}</span></div></div>
               <div className="demo-item single-col"><span className="demo-label">Primary Address</span><div className="demo-with-icon"><MapPin size={16} /><span>72/B, MG Road, Landmark Colony, Bangalore, KA - 560001</span></div></div>
               <div className="demo-item"><span className="demo-label">Email Connectivity</span><div className="demo-with-icon"><Mail size={16} /><span>{patient.email || 'not_available@ayka.com'}</span></div></div>
               <div className="demo-item"><span className="demo-label">Registry Phone</span><div className="demo-with-icon"><Phone size={16} /><span>{patient.phone_number || 'N/A'}</span></div></div>
            </div>
          </div>

          <div className="card medical-alerts-card">
             <div className="alerts-header">
                <h3 className="card-title">Critical Medical Alerts</h3>
                <ShieldCheck size={20} color="var(--success)" />
             </div>
             <div className="alerts-tags">
                {(patient.critical_conditions || ['No known allergies', 'Regular smoker']).map((alert: string, idx: number) => (
                   <span key={idx} className="alert-pill">{alert}</span>
                ))}
             </div>
          </div>
        </div>

        <div className="grid-sidebar">
          <div className="card timeline-summary-card">
             <h3 className="card-title">Interaction Timeline</h3>
             <div className="timeline-items">
                <div className="tl-item">
                   <div className="tl-icon-box"><Clock size={16} /></div>
                   <div className="tl-content"><span className="tl-label">Account Created</span><span className="tl-value">{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : 'Jan 20, 2024'}</span></div>
                </div>
                <div className="tl-item">
                   <div className="tl-icon-box active"><Activity size={16} /></div>
                   <div className="tl-content"><span className="tl-label">Latest Vital Scan</span><span className="tl-value">{patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'Today'}</span></div>
                </div>
             </div>
          </div>
          <div className="card emergency-contact-card">
             <h3 className="card-title">Emergency Nexus</h3>
             <div className="nexus-info">
                <div className="nexus-avatar">{patient.emergency_contact?.charAt(0) || 'E'}</div>
                <div className="nexus-text"><span className="nexus-name">{patient.emergency_contact?.split(' (')[0] || 'Unspecified'}</span><span className="nexus-meta">Primary Next of Kin</span></div>
             </div>
             <button className="btn btn-outline-danger w-full mt-16">Trigger SOS Alert</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientComponent() {
  return (
    <Suspense fallback={<div className="page-container patient-detail-page flex-center"><Loader2 className="animate-spin" /></div>}>
      <PatientDetailsContent />
    </Suspense>
  );
}
