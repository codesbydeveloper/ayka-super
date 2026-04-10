"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Package, ArrowLeft, Save, Loader2, Zap, Check, Plus, ShieldCheck, Database, Trash2, Globe
} from 'lucide-react';
import { api } from '@/utils/api';
import '../Subscriptions.css';

function SubscriptionDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [plan, setPlan] = useState({
    name: '',
    monthly: 0,
    quarterly: 0,
    half_yearly: 0,
    yearly: 0,
    badge: '',
    features: [''],
    user_cap: 5,
    storage_quota_gb: 10,
    api_calls_per_month: 10000,
    is_active: true
  });

  useEffect(() => {
    const fetchPlan = async () => {
      if (!id) return;
      try {
        const result = await api.get(`/api/v1/super-admin/subscription/plans/${id}`);
        if (result.success && result.data) {
          const d = result.data;
          setPlan({
            name: d.name || '',
            monthly: d.monthly || 0,
            quarterly: d.quarterly ?? 0,
            half_yearly: d.half_yearly ?? 0,
            yearly: d.yearly || 0,
            badge: d.badge || '',
            features: d.features && d.features.length > 0 ? d.features : [''],
            user_cap: d.user_cap || 5,
            storage_quota_gb: d.storage_quota_gb || 10,
            api_calls_per_month: d.api_calls_per_month || 10000,
            is_active: d.is_active ?? true
          });
        }
      } catch (err) {
        console.error('Failed to fetch plan', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [id]);

  const handleAddFeature = () => setPlan({ ...plan, features: [...plan.features, ''] });
  const handleRemoveFeature = (index: number) => setPlan({ ...plan, features: plan.features.filter((_, i) => i !== index) });
  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...plan.features];
    newFeatures[index] = value;
    setPlan({ ...plan, features: newFeatures });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const filteredFeatures = plan.features.filter(f => f.trim() !== '');
      const result = await api.put(`/api/v1/super-admin/subscription/plans/${id}`, { ...plan, features: filteredFeatures });
      if (result.success) router.push('/subscriptions');
      else alert(result.message || 'Failed to update plan');
    } catch (err: any) { alert(err.message || 'Error updating plan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure?')) return;
    setDeleting(true);
    try {
      const result = await api.delete(`/api/v1/super-admin/subscription/plans/${id}`);
      if (result.success) router.push('/subscriptions');
      else alert(result.message);
    } catch (err: any) { alert(err.message); }
    finally { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="page-container subscriptions-page flex-center">
        <Loader2 size={40} className="animate-spin" style={{ color: '#2A4638' }} />
        <p>Fetching tier configuration...</p>
      </div>
    );
  }

  return (
    <div className="page-container subscriptions-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-secondary" onClick={() => router.push('/subscriptions')} style={{ padding: '9px 14px' }}><ArrowLeft size={18} /></button>
          <div><h1 className="page-title">Edit Subscription Tier</h1><p className="page-subtitle">Modify parameters for the {plan.name} configuration.</p></div>
        </div>
        <button className="btn btn-secondary" onClick={handleDelete} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} disabled={deleting}>
          {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}<span>Delete Tier</span>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><Zap size={20} style={{ color: '#2A4638' }} /> Tier Identity & Pricing</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Tier Name</label><input type="text" className="form-input" readOnly value={plan.name} style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.05em', background: '#f1f5f9', cursor: 'not-allowed' }} /></div>
                <div className="form-group"><label className="form-label">Monthly Price (₹)</label><input type="number" className="form-input" required min="0" value={plan.monthly} onChange={e => setPlan({ ...plan, monthly: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">Quarterly Price (₹)</label><input type="number" className="form-input" required min="0" value={plan.quarterly} onChange={e => setPlan({ ...plan, quarterly: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">Half-yearly Price (₹)</label><input type="number" className="form-input" required min="0" value={plan.half_yearly} onChange={e => setPlan({ ...plan, half_yearly: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">Yearly Price (₹)</label><input type="number" className="form-input" required min="0" value={plan.yearly} onChange={e => setPlan({ ...plan, yearly: Number(e.target.value) })} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Highlight Badge</label><input type="text" className="form-input" value={plan.badge} onChange={e => setPlan({ ...plan, badge: e.target.value })} /></div>
              </div>
            </div>
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}><h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}><ShieldCheck size={20} style={{ color: '#10b981' }} /> Feature Lists</h3><button type="button" className="btn btn-secondary btn-sm" onClick={handleAddFeature} style={{ fontSize: 13, padding: '4px 12px' }}><Plus size={14} /> Add Feature</button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plan.features.map((feature, index) => (
                  <div key={index} style={{ display: 'flex', gap: 10 }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, background: '#f8fafc', color: '#10b981', flexShrink: 0 }}><Check size={18} /></div><input type="text" className="form-input" value={feature} onChange={e => handleFeatureChange(index, e.target.value)} required />{plan.features.length > 1 && (<button type="button" onClick={() => handleRemoveFeature(index)} style={{ background: 'none', border: 'none', color: '#ef4444', padding: '0 8px', cursor: 'pointer' }}><Plus size={18} style={{ transform: 'rotate(45deg)' }} /></button>)}</div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}><Database size={20} style={{ color: '#3b82f6' }} /> Resource Quotas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div className="form-group"><label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}><span>User Capacity</span><span style={{ color: '#3b82f6', fontWeight: 700 }}>{plan.user_cap} Users</span></label><input type="range" min="1" max="100" className="form-input" value={plan.user_cap} onChange={e => setPlan({ ...plan, user_cap: Number(e.target.value) })} style={{ padding: '8px 0', cursor: 'pointer' }} /></div>
                <div className="form-group"><label className="form-label">Storage Quota (GB)</label><input type="number" className="form-input" value={plan.storage_quota_gb} onChange={e => setPlan({ ...plan, storage_quota_gb: Number(e.target.value) })} /></div>
                <div className="form-group"><label className="form-label">API Calls per Month</label><input type="number" className="form-input" value={plan.api_calls_per_month} onChange={e => setPlan({ ...plan, api_calls_per_month: Number(e.target.value) })} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 800 }} disabled={saving}>{saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}<span>{saving ? 'Saving...' : 'Update Tier'}</span></button>
              <button type="button" className="btn btn-secondary" onClick={() => router.push('/subscriptions')} style={{ width: '100%', padding: '14px' }}>Cancel Changes</button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function ClientComponent() {
  return (<Suspense fallback={<div className="page-container flex-center"><Loader2 className="animate-spin" /></div>}><SubscriptionDetailsContent /></Suspense>);
}
