"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Building, ArrowLeft, Save, Loader2, Mail, Phone, MapPin, Calendar, FileText
} from 'lucide-react';
import { api } from '@/utils/api';
import '../../Leads.css';

function LeadDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lead, setLead] = useState({
    name: '', email: '', number: '', state: '', city: '', address: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const result = await api.get(`/api/v1/super-admin/leads/clinic-leads/${id}`);
        if (result.success && result.data) {
          const d = result.data;
          setLead({
            name: d.name || '',
            email: d.email || '',
            number: d.number || d.contact || '',
            state: d.state || '',
            city: d.city || '',
            address: d.address || '',
            date: d.date || d.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
          });
        }
      } catch (err) {
        console.error('Failed to fetch clinic lead', err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchLead();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await api.put(`/api/v1/super-admin/leads/clinic-leads/${id}`, lead);
      if (result.success) {
        router.push('/leads/clinics');
      } else {
        alert(result.message || 'Failed to save clinic lead');
      }
    } catch (err: any) {
      alert(err.message || 'Error saving lead');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container leads-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: '#2A4638' }} />
        <p style={{ marginTop: 12, color: '#6b7280' }}>Loading lead details...</p>
      </div>
    );
  }

  return (
    <div className="page-container leads-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => router.push('/leads/clinics')}
            style={{ padding: '9px 14px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Edit Clinic Lead</h1>
            <p className="page-subtitle">Update the details for this clinic acquisition opportunity.</p>
          </div>
        </div>
        <div className="lead-identity-group">
          <div className="lead-avatar" style={{ background: 'rgba(99,102,241,0.1)', color: '#2A4638' }}>
            <Building size={22} />
          </div>
          <div className="contact-info">
            <span className="contact-main">{lead.name || 'Unnamed Clinic'}</span>
            <span className="contact-sub">ID: #{id}</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={18} style={{ color: '#2A4638' }} /> Clinic Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Clinic Name</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={lead.name}
                    onChange={e => setLead({ ...lead, name: e.target.value })}
                    placeholder="Apollo Medical Center"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address / Details</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={lead.address}
                    onChange={e => setLead({ ...lead, address: e.target.value })}
                    placeholder="123 MG Road, Bangalore"
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={lead.date}
                    onChange={e => setLead({ ...lead, date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Mail size={18} style={{ color: '#2A4638' }} /> Contact Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={lead.email}
                    onChange={e => setLead({ ...lead, email: e.target.value })}
                    placeholder="contact@apollo.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={lead.number}
                    onChange={e => setLead({ ...lead, number: e.target.value })}
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} style={{ color: '#2A4638' }} /> Location
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={lead.state}
                    onChange={e => setLead({ ...lead, state: e.target.value })}
                    placeholder="Karnataka"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={lead.city}
                    onChange={e => setLead({ ...lead, city: e.target.value })}
                    placeholder="Bangalore"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="card" style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push('/leads/clinics')}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ClientComponent() {
  return (
    <Suspense fallback={<div className="page-container leads-page flex-center"><Loader2 className="animate-spin" /></div>}>
      <LeadDetailsContent />
    </Suspense>
  );
}
