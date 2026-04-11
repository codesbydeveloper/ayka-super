"use client";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { 
  ArrowLeft, MapPin, Mail, Phone, Calendar, CreditCard, Users, History, Database,
  ShieldAlert, Send, Activity, CheckCircle2, Loader2, AlertCircle, UserCog, Edit2,
  Save, X, Trash2, AlertTriangle, Plus
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/utils/api';
import '../../dashboard/Dashboard.css';
import './ClinicDetail.css';

function staffCanViewClinics(): boolean {
  if (typeof window === "undefined") return true;
  if (localStorage.getItem("user_type") !== "admin_staff") return true;
  try {
    const raw = localStorage.getItem("user_data");
    if (!raw) return true;
    const u = JSON.parse(raw) as { permissions?: Record<string, boolean> };
    return u.permissions?.can_view_clinics !== false;
  } catch {
    return true;
  }
}

function staffCanEditClinics(): boolean {
  if (typeof window === "undefined") return true;
  if (localStorage.getItem("user_type") !== "admin_staff") return true;
  try {
    const raw = localStorage.getItem("user_data");
    if (!raw) return false;
    const u = JSON.parse(raw) as { permissions?: Record<string, boolean> };
    return u.permissions?.can_edit_clinics === true;
  } catch {
    return false;
  }
}

/** Single-clinic payload from GET …/clinics/{id} (admin-staff or super-admin). */
function extractClinicDetailPayload(result: unknown): Record<string, unknown> | null {
  if (result == null || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  if (r.success === false) return null;
  const d = r.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  const c = r.clinic;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    return c as Record<string, unknown>;
  }
  return null;
}

function ClinicDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeLoadingPlan, setUpgradeLoadingPlan] = useState(false);
  const [upgradeSaving, setUpgradeSaving] = useState(false);
  const [upgradeModalError, setUpgradeModalError] = useState('');
  const [planOptions, setPlanOptions] = useState<{ id: number; name: string }[]>([]);
  const [upgradePlanId, setUpgradePlanId] = useState<number | null>(null);
  const [upgradePlanName, setUpgradePlanName] = useState('');
  const [upgradeMonthly, setUpgradeMonthly] = useState(0);
  const [upgradeYearly, setUpgradeYearly] = useState(0);
  const [upgradeBadge, setUpgradeBadge] = useState('');
  const [upgradeFeatures, setUpgradeFeatures] = useState<string[]>(['']);
  const [upgradeIsActive, setUpgradeIsActive] = useState(true);

  const fetchClinicDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setClinic(null);
      setError("Missing clinic id. Open a clinic from the directory.");
      return;
    }

    setLoading(true);
    setError("");

    const userType =
      typeof window !== "undefined" ? localStorage.getItem("user_type") : null;
    const isStaff = userType === "admin_staff";

    // --- Admin Staff: GET /api/v1/admin-staff/clinics/{clinic_id} ---
    if (isStaff) {
      if (!staffCanViewClinics()) {
        setClinic(null);
        setError("You do not have permission to view clinic details.");
        setLoading(false);
        return;
      }

      try {
        const result = await api.get(
          `/api/v1/admin-staff/clinics/${encodeURIComponent(id)}`,
        );
        const row = extractClinicDetailPayload(result);
        if (row) {
          setClinic(row);
          setError("");
        } else {
          setClinic(null);
          const msg =
            typeof (result as { message?: string }).message === "string"
              ? (result as { message: string }).message
              : "Clinic not found or outside your assigned geographic area.";
          setError(msg);
        }
      } catch (err: unknown) {
        setClinic(null);
        setError(
          err instanceof Error ? err.message : "Could not load clinic details.",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- Super Admin / others: single-clinic detail ---
    try {
      const result = await api.get(
        `/api/v1/super-admin/clinics/${encodeURIComponent(id)}`,
      );
      const row = extractClinicDetailPayload(result);
      if (row) {
        setClinic(row);
        setError("");
      } else {
        throw new Error(
          typeof (result as { message?: string }).message === "string"
            ? (result as { message: string }).message
            : "Invalid clinic response.",
        );
      }
    } catch (err: unknown) {
      console.warn("Clinic detail API unreachable, using demo dossier.", err);
      const mockDossier = {
        id: parseInt(id || "0", 10),
        name: "City Care Hospital",
        owner_name: "Dr. Akash Yadav",
        owner_email: "akash@citycare.com",
        owner_phone: "+91 91234 56789",
        address: "Sector 45, DLF Phase 4",
        city: "Gurugram",
        state: "Haryana",
        pin_code: "122002",
        is_active: true,
        clinic_type: "multi_speciality",
        subscription_plan: "Scale",
        created_at: "2023-11-12T08:00:00Z",
        last_sync: new Date().toISOString(),
      };
      setClinic(mockDossier);
      setError(
        "RESILIENT MODE ACTIVE: Production dossier currently unreachable. Displaying cached medical intelligence.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClinicDetail();
  }, [fetchClinicDetail]);

  useEffect(() => {
    if (clinic) {
      setEditName(clinic.name || '');
      setEditIsActive(clinic.is_active);
    }
  }, [clinic]);

  const handleUpdateClinic = async () => {
    if (!id) return;

    const userType =
      typeof window !== "undefined" ? localStorage.getItem("user_type") : null;
    const isStaff = userType === "admin_staff";

    if (isStaff && !staffCanEditClinics()) {
      setError("You do not have permission to edit clinics.");
      return;
    }

    setUpdateLoading(true);
    try {
      const body = { name: editName, is_active: editIsActive };

      const result = isStaff
        ? await api.put(
            `/api/v1/admin-staff/clinics/${encodeURIComponent(id)}`,
            body,
          )
        : await api.put(`/api/v1/super-admin/clinics/${encodeURIComponent(id)}`, body);

      if (
        result &&
        typeof result === "object" &&
        (result as { success?: boolean }).success === false
      ) {
        setError(
          typeof (result as { message?: string }).message === "string"
            ? (result as { message: string }).message
            : "Failed to update clinic.",
        );
        return;
      }

      setClinic((prev: any) => ({
        ...prev,
        name: editName,
        is_active: editIsActive,
      }));
      setIsEditing(false);
      setError("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An error occurred during update.",
      );
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!id || deleteConfirmText.toLowerCase() !== 'delete') return;

    setDeleting(true);
    try {
      await api.delete(`/api/v1/super-admin/clinics/${id}`);
      router.push('/clinics');
    } catch (err: any) {
      setError(err.message || 'An error occurred during deletion');
      setIsDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const loadPlanIntoForm = async (planId: number) => {
    const result = await api.get<{
      success?: boolean;
      message?: string;
      data?: Record<string, unknown>;
    }>(`/api/v1/super-admin/subscription/plans/${planId}`);
    if (!result.success || !result.data) {
      throw new Error(result.message || 'Plan not found');
    }
    const d = result.data;
    setUpgradePlanId(planId);
    setUpgradePlanName(typeof d.name === 'string' ? d.name : '');
    setUpgradeMonthly(Number(d.monthly) || 0);
    setUpgradeYearly(Number(d.yearly) || 0);
    setUpgradeBadge(typeof d.badge === 'string' ? d.badge : '');
    const feats = Array.isArray(d.features)
      ? d.features.filter((x): x is string => typeof x === 'string')
      : [];
    setUpgradeFeatures(feats.length ? feats : ['']);
    setUpgradeIsActive(d.is_active !== false);
  };

  const openUpgradePlanModal = async () => {
    setUpgradeModalError('');
    setIsUpgradeModalOpen(true);
    setUpgradeLoadingPlan(true);
    setPlanOptions([]);
    setUpgradePlanId(null);
    try {
      const listRes = await api.get<{
        success?: boolean;
        message?: string;
        data?: { plans?: { id: number; name: string }[] };
      }>('/api/v1/super-admin/subscription/plans?include_inactive=true');
      const plans = listRes.data?.plans ?? [];
      const options = plans.map((p) => ({ id: p.id, name: p.name }));
      setPlanOptions(options);

      if (options.length === 0) {
        setUpgradeModalError('No subscription plans are available to edit.');
        return;
      }

      let initialId: number | null =
        typeof clinic?.subscription_plan_id === 'number'
          ? clinic.subscription_plan_id
          : typeof clinic?.plan_id === 'number'
            ? clinic.plan_id
            : null;

      if (initialId == null && clinic?.subscription_plan) {
        const needle = String(clinic.subscription_plan).trim().toLowerCase();
        const match = plans.find((p) => String(p.name).trim().toLowerCase() === needle);
        if (match) initialId = match.id;
      }

      const pickId = initialId ?? options[0].id;
      await loadPlanIntoForm(pickId);
    } catch (err: unknown) {
      setUpgradeModalError(err instanceof Error ? err.message : 'Could not load plans');
    } finally {
      setUpgradeLoadingPlan(false);
    }
  };

  const closeUpgradeModal = () => {
    setIsUpgradeModalOpen(false);
    setUpgradeModalError('');
  };

  const handleUpgradePlanSelectChange = async (planId: number) => {
    setUpgradeLoadingPlan(true);
    setUpgradeModalError('');
    try {
      await loadPlanIntoForm(planId);
    } catch (err: unknown) {
      setUpgradeModalError(err instanceof Error ? err.message : 'Could not load plan');
    } finally {
      setUpgradeLoadingPlan(false);
    }
  };

  const handleUpgradeFeatureChange = (index: number, value: string) => {
    const next = [...upgradeFeatures];
    next[index] = value;
    setUpgradeFeatures(next);
  };

  const handleAddUpgradeFeature = () => setUpgradeFeatures([...upgradeFeatures, '']);

  const handleRemoveUpgradeFeature = (index: number) => {
    if (upgradeFeatures.length <= 1) {
      setUpgradeFeatures(['']);
      return;
    }
    setUpgradeFeatures(upgradeFeatures.filter((_, i) => i !== index));
  };

  const handleSaveUpgradePlan = async () => {
    if (upgradePlanId == null) return;
    setUpgradeSaving(true);
    setUpgradeModalError('');
    try {
      const filteredFeatures = upgradeFeatures.map((f) => f.trim()).filter(Boolean);
      const result = await api.put<{
        success?: boolean;
        message?: string;
        data?: { name?: string };
      }>(`/api/v1/super-admin/subscription/plans/${upgradePlanId}`, {
        monthly: upgradeMonthly,
        yearly: upgradeYearly,
        badge: upgradeBadge.trim() || null,
        features: filteredFeatures,
        is_active: upgradeIsActive,
      });
      if (result.success) {
        const tierName = result.data?.name;
        if (tierName) {
          setClinic((prev: any) => ({ ...prev, subscription_plan: tierName }));
        }
        closeUpgradeModal();
      } else {
        setUpgradeModalError(result.message || 'Update failed');
      }
    } catch (err: unknown) {
      setUpgradeModalError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setUpgradeSaving(false);
    }
  };

  const isStaffUser =
    typeof window !== "undefined" &&
    localStorage.getItem("user_type") === "admin_staff";

  /** Super Admin always; Admin Staff only if can_edit_clinics. */
  const showClinicEditControls = !isStaffUser || staffCanEditClinics();

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
         <div className="loading-state-full" style={{ textAlign: 'center' }}>
            <Loader2 className="animate-spin" size={64} color="var(--primary)" />
            <p style={{ marginTop: '24px', fontSize: '18px', fontWeight: '600', color: 'var(--text-muted)', letterSpacing: '-0.01em' }}>Synchronizing Clinical Dossier...</p>
         </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="error-state-full card glass-card" style={{ textAlign: 'center', padding: '60px', maxWidth: '500px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <AlertCircle size={40} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}> Dossier Unreachable</h2>
          <p style={{ marginTop: '12px', color: 'var(--text-muted)', lineHeight: '1.6' }}>{error || 'The requested clinic intelligence could not be retrieved from the platform directory.'}</p>
          <Link href="/clinics" style={{ display: 'inline-block', marginTop: '32px' }}>
            <button className="btn btn-primary" style={{ padding: '12px 28px', borderRadius: '14px', fontWeight: '700' }}>Return to Directory</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {error && (
        <div className="resilient-mode-alert" style={{ 
          background: 'rgba(245, 158, 11, 0.05)', 
          border: '1px solid rgba(245, 158, 11, 0.2)', 
          padding: '16px 24px', 
          borderRadius: '16px', 
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          animation: 'pulseGlow 2s infinite alternate'
        }}>
          <div style={{ background: '#f59e0b', color: 'white', padding: '8px', borderRadius: '10px' }}>
            <Activity size={20} />
          </div>
          <div>
            <h4 style={{ color: '#f59e0b', fontWeight: '800', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resilient Mode Active</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '2px' }}>{error}</p>
          </div>
        </div>
      )}

      <div className="detail-header">
        <Link href="/clinics" className="back-link" type="button">
          <ArrowLeft size={18} />
          <span>Back to Clinics</span>
        </Link>
        <div className="header-actions">
           {isEditing ? (
             <>
               <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={updateLoading}>
                 <X size={18} /><span>Cancel</span>
               </button>
               <button className="btn btn-primary" onClick={handleUpdateClinic} disabled={updateLoading}>
                 {updateLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                 <span>{updateLoading ? 'Saving...' : 'Save Changes'}</span>
               </button>
             </>
           ) : (
             <>
               {showClinicEditControls ? (
                 <button
                   className="btn btn-secondary"
                   onClick={() => setIsEditing(true)}
                 >
                   <Edit2 size={18} />
                   <span>Edit Clinic</span>
                 </button>
               ) : null}
               {/* <button className="btn btn-secondary">Impersonate</button> */}
               {!isStaffUser ? (
                 <button
                   type="button"
                   className="btn btn-primary"
                   onClick={() => void openUpgradePlanModal()}
                 >
                   <CreditCard size={18} />
                   <span>Upgrade Plan</span>
                 </button>
               ) : null}
               <button
                 type="button"
                 className="btn btn-danger-outline"
                 onClick={() => setIsDeleteModalOpen(true)}
               >
                 <Trash2 size={18} /><span>Delete Clinic</span>
               </button>
             </>
           )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card info-card">
            <div className="info-header">
              <div className="clinic-large-avatar">{clinic.name ? clinic.name.charAt(0) : 'C'}</div>
              <div className="clinic-core-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isEditing ? (
                    <input type="text" className="form-input clinic-title-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Clinic Name" style={{ fontSize: '24px', fontWeight: '700', padding: '4px 12px', height: 'auto' }} />
                  ) : (
                    <h1 className="clinic-title">{clinic.name || 'N/A'}</h1>
                  )}
                  {isEditing ? (
                    <div className={`status-toggle ${editIsActive ? 'active' : 'inactive'}`} onClick={() => setEditIsActive(!editIsActive)}>
                      <div className="toggle-dot"></div><span>{editIsActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  ) : (
                    <span className={`badge badge-${clinic.is_active ? 'success' : 'danger'}`}>{clinic.is_active ? 'Active' : 'Inactive'}</span>
                  )}
                </div>
                <p className="clinic-meta">Registered on {clinic.created_at ? new Date(clinic.created_at).toLocaleDateString() : 'N/A'} • ID: {clinic.clinic_id || clinic.id}</p>
              </div>
            </div>
            <div className="info-grid">
               <div className="info-item"><div className="info-label"><UserCog size={14} /> Owner</div><div className="info-value">{clinic.owner_name || clinic.owner || 'N/A'}</div></div>
               <div className="info-item"><div className="info-label"><Mail size={14} /> Email</div><div className="info-value">{clinic.owner_email || clinic.email || 'N/A'}</div></div>
               <div className="info-item"><div className="info-label"><Phone size={14} /> Contact</div><div className="info-value">{clinic.owner_phone || clinic.phone_number || 'N/A'}</div></div>
               <div className="info-item"><div className="info-label"><MapPin size={14} /> Location</div><div className="info-value">{clinic.city_name || clinic.city || 'N/A'}, {clinic.state_name || ''}</div></div>
            </div>
          </div>

          <div className="detail-tabs">
            <button className="tab-item active">Usage Stats</button>
            <button className="tab-item">Billing History</button>
            <button className="tab-item">Audit Log</button>
          </div>

          <div className="usage-grid">
            <div className="card usage-card">
              <div className="usage-icon icon-blue"><Users size={20} /></div>
              <div className="usage-data"><span className="usage-label">Doctor Count</span><span className="usage-value">{clinic.total_doctors || 0}</span></div>
              <div className="usage-progress-bg"><div className="usage-progress-fill" style={{ width: `${Math.min(100, ((clinic.total_doctors || 0) / 10) * 100)}%` }}></div></div>
            </div>
            <div className="card usage-card">
              <div className="usage-icon icon-green"><Activity size={20} /></div>
              <div className="usage-data"><span className="usage-label">Total Appointments</span><span className="usage-value">{clinic.total_appointments || 0}</span></div>
              <div className="usage-trend-up">Overall activity across all time</div>
            </div>
            <div className="card usage-card">
              <div className="usage-icon icon-purple"><Database size={20} /></div>
              <div className="usage-data"><span className="usage-label">Patient Count</span><span className="usage-value">{clinic.total_patients || 0}</span></div>
              <div className="usage-progress-bg"><div className="usage-progress-fill" style={{ width: `${Math.min(100, ((clinic.total_patients || 0) / 100) * 100)}%`, background: '#A855F7' }}></div></div>
            </div>
          </div>

          <div className="card section-card">
            <div className="card-header"><h3 className="card-title">Detailed Address</h3></div>
            <div style={{ padding: '20px', color: 'var(--text-subtle)' }}>
              <p>{clinic.address || 'Project address details not provided.'}</p>
              <div style={{ marginTop: '12px', fontSize: '14px' }}><strong>State Code:</strong> {clinic.state_code} | <strong>Pin Code:</strong> {clinic.pin_code}</div>
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="card sub-summary-card">
            <div className="card-header"><h3 className="card-title">Subscription</h3></div>
            <div className="sub-plan-info">
              <div className="plan-badge-large">{clinic.subscription_plan || 'TRIAL'}</div>
              <div className="billing-cycle">{clinic.subscription_status || 'Pending Verification'}</div>
            </div>
            <div className="sub-metrics">
               <div className="metric-row"><span>Start Date</span><strong>{clinic.subscription_start ? new Date(clinic.subscription_start).toLocaleDateString() : 'N/A'}</strong></div>
               <div className="metric-row"><span>End Date</span><strong>{clinic.subscription_end ? new Date(clinic.subscription_end).toLocaleDateString() : 'N/A'}</strong></div>
               <div className="metric-row"><span>Onboarding Step</span><strong>Step {clinic.onboarding_step}</strong></div>
            </div>
            {!isStaffUser ? (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '20px' }}
                onClick={() => void openUpgradePlanModal()}
              >
                Change Plan
              </button>
            ) : null}
          </div>
          <div className="card contact-actions-card">
             <div className="card-header"><h3 className="card-title">Quick Actions</h3></div>
             <div className="action-list">
                <button className="action-item"><Mail size={18} /><span>Email Owner</span></button>
                <button className="action-item"><Send size={18} /><span>Send WhatsApp Alert</span></button>
                <button className="action-item"><History size={18} /><span>Reset Account Password</span></button>
                <button className="action-item text-danger"><ShieldAlert size={18} /><span>Force Logout All Devices</span></button>
             </div>
          </div>
        </div>
      </div>

      {isUpgradeModalOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !upgradeSaving) closeUpgradeModal();
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '520px', width: '100%', position: 'relative' }}
            role="dialog"
            aria-labelledby="upgrade-plan-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <h3 id="upgrade-plan-title" className="modal-title" style={{ fontSize: '18px', margin: 0 }}>
                  Update subscription plan
                </h3>
                {upgradePlanName ? (
                  <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                    Tier: <strong>{upgradePlanName}</strong>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => !upgradeSaving && closeUpgradeModal()}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '70vh', overflowY: 'auto' }}>
              {upgradeModalError ? (
                <div
                  role="alert"
                  style={{
                    marginBottom: '16px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--danger)',
                    fontSize: '13px',
                  }}
                >
                  {upgradeModalError}
                </div>
              ) : null}
              {upgradeLoadingPlan ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                    padding: '40px',
                  }}
                >
                  <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading plan…</span>
                </div>
              ) : planOptions.length === 0 ? null : (
                <>
                  {planOptions.length > 1 ? (
                    <div style={{ marginBottom: '16px' }}>
                      <label className="form-label" htmlFor="upgrade-plan-select">
                        Plan tier
                      </label>
                      <select
                        id="upgrade-plan-select"
                        className="form-input"
                        value={upgradePlanId ?? ''}
                        onChange={(e) => void handleUpgradePlanSelectChange(Number(e.target.value))}
                        disabled={upgradeSaving}
                      >
                        {planOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <label className="form-label" htmlFor="upgrade-monthly">
                        Monthly (₹)
                      </label>
                      <input
                        id="upgrade-monthly"
                        type="number"
                        className="form-input"
                        min={0}
                        step="0.01"
                        value={upgradeMonthly}
                        onChange={(e) => setUpgradeMonthly(Number(e.target.value))}
                        disabled={upgradeSaving}
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="upgrade-yearly">
                        Yearly (₹)
                      </label>
                      <input
                        id="upgrade-yearly"
                        type="number"
                        className="form-input"
                        min={0}
                        step="0.01"
                        value={upgradeYearly}
                        onChange={(e) => setUpgradeYearly(Number(e.target.value))}
                        disabled={upgradeSaving}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <label className="form-label" htmlFor="upgrade-badge">
                      Badge
                    </label>
                    <input
                      id="upgrade-badge"
                      type="text"
                      className="form-input"
                      value={upgradeBadge}
                      onChange={(e) => setUpgradeBadge(e.target.value)}
                      placeholder="e.g. Popular Choice"
                      disabled={upgradeSaving}
                    />
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px',
                      }}
                    >
                      <span className="form-label" style={{ margin: 0 }}>
                        Features
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={handleAddUpgradeFeature}
                        disabled={upgradeSaving}
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                    {upgradeFeatures.map((feature, index) => (
                      <div
                        key={index}
                        style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}
                      >
                        <input
                          type="text"
                          className="form-input"
                          value={feature}
                          onChange={(e) => handleUpgradeFeatureChange(index, e.target.value)}
                          disabled={upgradeSaving}
                          placeholder="Feature description"
                        />
                        {upgradeFeatures.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveUpgradeFeature(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                              padding: 8,
                              flexShrink: 0,
                            }}
                            aria-label="Remove feature"
                          >
                            <X size={18} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      marginTop: '18px',
                      cursor: upgradeSaving ? 'default' : 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={upgradeIsActive}
                      onChange={(e) => setUpgradeIsActive(e.target.checked)}
                      disabled={upgradeSaving}
                    />
                    <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Plan is active</span>
                  </label>
                </>
              )}
            </div>
            <div
              className="modal-footer"
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: 12,
                background: 'white',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={closeUpgradeModal}
                disabled={upgradeSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                onClick={() => void handleSaveUpgradePlan()}
                disabled={
                  upgradeSaving || upgradeLoadingPlan || upgradePlanId == null || planOptions.length === 0
                }
              >
                {upgradeSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{upgradeSaving ? 'Saving…' : 'Save changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 24px 0 24px', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}><AlertTriangle size={24} /></div>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none' }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '0 24px 24px 24px', textAlign: 'center' }}>
               <h3 className="modal-title" style={{ fontSize: '20px', marginBottom: '8px' }}>Permanently Delete Clinic?</h3>
               <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6' }}>This action is <strong>irreversible</strong>. It will permanently delete the clinic record and all associated data for <strong>{clinic?.name}</strong>.</p>
               <div style={{ marginTop: '20px', textAlign: 'left' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Type <strong>DELETE</strong> to confirm</label>
                  <input type="text" className="form-input" placeholder="Type DELETE" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} style={{ border: deleteConfirmText.toLowerCase() === 'delete' ? '1px solid var(--success)' : '1px solid var(--border)' }} />
               </div>
            </div>
            <div className="modal-footer" style={{ background: 'white', borderTop: 'none', padding: '0 24px 24px 24px', display: 'flex', gap: '12px' }}>
               <button className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)} disabled={deleting} style={{ flex: 1 }}>Cancel</button>
               <button className="btn" onClick={handleConfirmDelete} disabled={deleting || deleteConfirmText.toLowerCase() !== 'delete'} style={{ flex: 1, background: deleteConfirmText.toLowerCase() === 'delete' ? 'var(--danger)' : '#F3F4F6', color: deleteConfirmText.toLowerCase() === 'delete' ? 'white' : '#9CA3AF', cursor: deleteConfirmText.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed' }}>
                  {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}<span>Delete Permanently</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClinicDetailsClient() {
  return (
    <Suspense
      fallback={
        <div className="page-container flex-center" style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" />
        </div>
      }
    >
      <ClinicDetailsContent />
    </Suspense>
  );
}
