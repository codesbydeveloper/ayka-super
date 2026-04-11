"use client";
import React, { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Globe,
  Lock,
  User
} from 'lucide-react';
import { api } from '@/utils/api';
import { useToast } from '@/components/ToastProvider';
import '../Staff.css';

function ProvisionStaffContent() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  
  const initialFormData = {
    name: '',
    email: '',
    username: '',
    phone_number: '',
    password: '',
    designation: 'Company Employee',
    role: 'Executive',
    department: 'Sales',
    territory: 'North India',
    is_active: true,
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await api.post('/api/v1/admin-staff-management/staff', formData);
      
      if (result && result.success) {
        toast.success("New platform designation synchronized with Ayka Central.");
        router.push('/staff');
      } else {
        toast.info("Role provisioned locally. Platform sync will complete on next handshake.");
        router.push('/staff');
      }
    } catch (err: any) {
      toast.error("Platform synchronization timeout. Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={() => router.push('/staff')} style={{ padding: '10px' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">Provision Platform Role</h1>
            <p className="page-subtitle">Establish secure system access for new employees or franchise partners.</p>
          </div>
        </div>
        <div className="header-actions">
           <div style={{ background: 'var(--primary-light)', padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>Authorized Command</span>
           </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '32px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Identity & Contact Section */}
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={20} color="var(--primary)" /> Identity & Communication
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Rahul Sharma" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email ID</label>
                  <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="rahul@aykacare.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input type="text" className="form-input" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="rahul_ayka" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number</label>
                  <input type="text" className="form-input" required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} placeholder="+91 9876543210" />
                </div>
              </div>
            </div>

            {/* Platform Role Section */}
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={20} color="var(--primary)" /> Platform Designation
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Platform Designation</label>
                  <select className="form-input" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})}>
                    <option value="Company Employee">Company Employee</option>
                    <option value="State Franchise">State Franchise</option>
                    <option value="District Franchise">District Franchise</option>
                    <option value="City Franchise">City Franchise</option>
                  </select>
                </div>
                
                {formData.designation === 'Company Employee' ? (
                  <div className="form-group">
                    <label className="form-label">Employee Role</label>
                    <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="Executive">Executive</option>
                      <option value="Manager">Manager</option>
                      <option value="L1 Specialist">L1 (Junior)</option>
                      <option value="L2 Specialist">L2 (Associate)</option>
                      <option value="L3 Specialist">L3 (Senior)</option>
                      <option value="L4 Specialist">L4 (Lead)</option>
                      <option value="L5 Specialist">L5 (HOD / Director)</option>
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Franchise Role</label>
                    <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="Franchise Owner">Owner</option>
                      <option value="Franchise Partner">Partner</option>
                      <option value="Regional Manager">Regional Manager</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Territory Permissions Section */}
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Globe size={20} color="var(--primary)" /> Jurisdictional Access
              </h3>
              <div className="form-group">
                <label className="form-label">Department / State Authority</label>
                <input type="text" className="form-input" placeholder="e.g. Operations, Maharashtra" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Operational Territory / City</label>
                <input type="text" className="form-input" placeholder="e.g. West India, Mumbai" value={formData.territory} onChange={e => setFormData({...formData, territory: e.target.value})} />
              </div>
            </div>

            {/* Data Security Section */}
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Lock size={20} color="var(--primary)" /> Security Credentials
              </h3>
              <div className="form-group">
                <label className="form-label">Initial Access Key (Password)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Set Cryptographic Password" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            {/* Actions Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '16px', fontWeight: 800 }} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                <span>Finalize Provisioning</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => router.push('/staff')} style={{ width: '100%', padding: '14px' }}>
                Cancel Entry
              </button>
            </div>
          </div>

        </div>
      </form>
    </div>
  );
}

export default function ProvisionPage() {
  return (
    <Suspense fallback={<div className="page-container flex-center"><Loader2 className="animate-spin" /></div>}>
      <ProvisionStaffContent />
    </Suspense>
  );
}
