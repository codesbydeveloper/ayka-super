"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, ArrowLeft, Loader2, Mail, Phone, MapPin, Plus, Tag
} from 'lucide-react';
import { api } from '@/utils/api';
import { useToast } from '@/components/ToastProvider';
import { listLeadLabels, type LeadLabel } from '@/utils/leadLabels';

export default function NewClinicLeadPage() {
  const router = useRouter();
  const toast = useToast();

  const [saving, setSaving] = useState(false);
  const [labels, setLabels] = useState<LeadLabel[]>([]);
  const [labelsLoading, setLabelsLoading] = useState(true);
  const [labelsError, setLabelsError] = useState<string | null>(null);
  const [lead, setLead] = useState({
    name: '', email: '', number: '', state: '', city: '', address: '',
    date: new Date().toISOString().split('T')[0],
    label_id: 0,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLabelsLoading(true);
      setLabelsError(null);
      try {
        const list = await listLeadLabels(false);
        if (!cancelled) setLabels(list);
      } catch (err) {
        if (!cancelled) {
          setLabels([]);
          setLabelsError(
            err instanceof Error ? err.message : 'Could not load lead labels.',
          );
        }
      } finally {
        if (!cancelled) setLabelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { label_id, ...rest } = lead;
      const payload: Record<string, unknown> = { ...rest };
      const lid = Number(label_id);
      const selectedLabel = labels.find((l) => l.id === lid);
      if (lid > 0 && selectedLabel) {
        payload.label_id = lid;
        payload.label_name = selectedLabel.label_name.trim();
      }
      const result = await api.post('/api/v1/super-admin/leads/clinic-leads', payload);
      if (result.success) {
        router.push('/leads/clinics');
      } else {
        toast.error(result.message || 'Failed to create clinic lead');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container leads-page">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn btn-secondary"
            onClick={() => router.push('/leads/clinics')}
            style={{ padding: '9px 14px' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Add New Clinic Lead</h1>
            <p className="page-subtitle">Register a new clinic into the acquisition pipeline.</p>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Building size={18} style={{ color: '#2A4638' }} /> Clinic Identity
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
                    placeholder="e.g. Apollo Medical Center"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address / Primary Details</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={lead.address}
                    onChange={e => setLead({ ...lead, address: e.target.value })}
                    placeholder="Street, Area, Landmark..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={lead.date}
                    onChange={e => setLead({ ...lead, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  {labelsError ? (
                    <p
                      className="section-hint"
                      style={{ color: '#c0392b', margin: '0 0 8px' }}
                      role="alert"
                    >
                      {labelsError}
                    </p>
                  ) : null}
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag size={16} style={{ color: '#2A4638' }} aria-hidden />
                    Label
                  </label>
                  <select
                    className="form-input"
                    value={lead.label_id > 0 ? String(lead.label_id) : ''}
                    onChange={(e) =>
                      setLead({
                        ...lead,
                        label_id: e.target.value === '' ? 0 : Number(e.target.value),
                      })
                    }
                    disabled={labelsLoading}
                  >
                    {labelsLoading ? (
                      <option value="">Loading labels…</option>
                    ) : (
                      <>
                        <option value="">No label</option>
                        {labels.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.label_name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
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
                  <label className="form-label">Official Email</label>
                  <input
                    type="email"
                    className="form-input"
                    required
                    value={lead.email}
                    onChange={e => setLead({ ...lead, email: e.target.value })}
                    placeholder="contact@clinic.com"
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
                <MapPin size={18} style={{ color: '#2A4638' }} /> Territory
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
            Discard
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            <span>{saving ? 'Creating...' : 'Create Clinic Lead'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
