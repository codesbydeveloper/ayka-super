"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  GraduationCap, 
  Briefcase, 
  Wallet, 
  Calendar, 
  Plus, 
  Trash2, 
  Loader2,
  Stethoscope,
  Clock,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/utils/api';
import '../../dashboard/Dashboard.css';
import './DoctorForm.css';

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function splitFullName(full: string): { first_name: string; last_name: string } {
  const t = full.trim();
  if (!t) return { first_name: '', last_name: '' };
  const i = t.indexOf(' ');
  if (i === -1) return { first_name: t, last_name: t };
  return { first_name: t.slice(0, i).trim(), last_name: t.slice(i + 1).trim() };
}

function individualDoctorsPath(): string {
  if (typeof window === 'undefined') return '/api/v1/super-admin/individual-doctors';
  const userType = localStorage.getItem('user_type');
  return userType === 'admin_staff'
    ? '/api/v1/admin-staff/individual-doctors'
    : '/api/v1/super-admin/individual-doctors';
}

type SubscriptionPlanOption = {
  id: number;
  name: string;
};

type PlansListResponse = {
  success?: boolean;
  message?: string;
  data?: {
    plans?: SubscriptionPlanOption[];
  };
};

function subscriptionPlansListPath(): string {
  return '/api/v1/super-admin/subscription/plans';
}

export default function NewDoctorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<SubscriptionPlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    specialisation: '',
    phone_number: '',
    email: '',
    password: '',
    qualification: '',
    experience_years: 0,
    consultation_fee: 0,
    registration_number: '',
    plan_id: 0,
    billing_cycle: 'yearly' as 'monthly' | 'yearly',
    availability: [
      { day_of_week: 1, time_slot: 'morning', start_time: '09:00', end_time: '13:00' }
    ]
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      setPlansLoading(true);
      setPlansError(null);
      try {
        const result = await api.get<PlansListResponse>(
          `${subscriptionPlansListPath()}?include_inactive=false`,
        );
        const list = result.data?.plans ?? [];
        if (cancelled) return;
        setPlans(list);
        setFormData((prev) => {
          const ids = new Set(list.map((p) => p.id));
          const nextId =
            prev.plan_id > 0 && ids.has(prev.plan_id)
              ? prev.plan_id
              : (list[0]?.id ?? 0);
          return { ...prev, plan_id: nextId };
        });
      } catch (err) {
        if (!cancelled) {
          setPlans([]);
          setPlansError(
            err instanceof Error ? err.message : 'Could not load subscription plans.',
          );
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    }

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]:
        name === 'experience_years' || name === 'consultation_fee' || name === 'plan_id'
          ? Number(value)
          : value,
    }));
  };

  const handleAvailabilityChange = (index: number, field: string, value: string | number) => {
    const newAvailability = [...formData.availability];
    newAvailability[index] = { ...newAvailability[index], [field]: field === 'day_of_week' ? Number(value) : value };
    setFormData(prev => ({ ...prev, availability: newAvailability }));
  };

  const addAvailabilitySlot = () => {
    setFormData(prev => ({
      ...prev,
      availability: [...prev.availability, { day_of_week: 1, time_slot: 'morning', start_time: '09:00', end_time: '17:00' }]
    }));
  };

  const removeAvailabilitySlot = (index: number) => {
    if (formData.availability.length === 1) return;
    const newAvailability = formData.availability.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, availability: newAvailability }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { first_name, last_name } = splitFullName(formData.name);
    if (!first_name.trim()) {
      setError('Please enter the specialist’s full legal name.');
      setLoading(false);
      return;
    }

    const availabilityNotes = formData.availability
      .map(
        (s) =>
          `${DAY_LABELS[s.day_of_week] ?? s.day_of_week}: ${s.time_slot} ${s.start_time}–${s.end_time}`,
      )
      .join(' | ');

    const planId = Number(formData.plan_id);
    if (!planId || !plans.some((p) => p.id === planId)) {
      setError('Please select a subscription plan.');
      setLoading(false);
      return;
    }

    const payload: Record<string, unknown> = {
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.replace(/\s/g, ''),
      specialisation: formData.specialisation.trim(),
      qualification: formData.qualification.trim(),
      experience_years: Math.max(0, Number(formData.experience_years) || 0),
      registration_number: formData.registration_number.trim(),
      consultation_fee: Math.max(0, Number(formData.consultation_fee) || 0),
      plan_id: planId,
      billing_cycle: formData.billing_cycle,
    };

    if (availabilityNotes) {
      payload.notes = `Availability: ${availabilityNotes}`;
    }

    try {
      const result = await api.post(individualDoctorsPath(), payload);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/doctors');
        }, 2000);
      } else {
        setError(
          typeof result.message === 'string'
            ? result.message
            : 'Registration failed.',
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Registration could not be completed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-overlay">
        <div className="success-content animate-in">
          <div className="success-icon-wrapper">
            <CheckCircle2 size={48} color="white" />
          </div>
          <h2>Specialist Registered Successfully</h2>
          <p>Dr. {formData.name} has been added to the medical personnel directory.</p>
          <div className="redirect-hint">Redirecting to directory...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page-wrapper">
      <div className="form-container">
        {/* Header Section */}
        <div className="form-header-modern">
          <button className="back-btn-pill" onClick={() => router.push('/doctors')}>
            <ArrowLeft size={16} />
            <span>Personnel Directory</span>
          </button>
          <div className="header-text-group">
            <h1>Register New Specialist</h1>
            <p>Onboard a new medical professional into the Ayka ecosystem.</p>
          </div>
        </div>

        {error && (
          <div className="error-banner animate-in">
            <div className="error-icon">!</div>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="premium-form-layout">
          <div className="form-grid">
            {/* Essential Identity Card */}
            <div className="form-card-column">
              <div className="card-section">
                <div className="section-title">
                  <User size={18} />
                  <span>Professional Identity</span>
                </div>
                <div className="input-group">
                  <label>Full Legal Name</label>
                  <div className="input-icon-wrapper">
                    <User className="field-icon" size={16} />
                    <input 
                      type="text" 
                      name="name" 
                      placeholder="e.g. Dr. Akash Yadav" 
                      value={formData.name}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Medical Specialisation</label>
                  <div className="input-icon-wrapper">
                    <Stethoscope className="field-icon" size={16} />
                    <input 
                      type="text" 
                      name="specialisation" 
                      placeholder="e.g. Interventional Cardiology" 
                      value={formData.specialisation}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>Qualifications</label>
                    <div className="input-icon-wrapper">
                      <GraduationCap className="field-icon" size={16} />
                      <input 
                        type="text" 
                        name="qualification" 
                        placeholder="MBBS, MD" 
                        value={formData.qualification}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Experience (Years)</label>
                    <div className="input-icon-wrapper">
                      <Briefcase className="field-icon" size={16} />
                      <input 
                        type="number" 
                        name="experience_years" 
                        placeholder="10" 
                        value={formData.experience_years}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                </div>
                <div className="input-group">
                  <label>Consultation Fee (Base)</label>
                  <div className="input-icon-wrapper">
                    <Wallet className="field-icon" size={16} />
                    <input 
                      type="number" 
                      name="consultation_fee" 
                      placeholder="₹ 500" 
                      value={formData.consultation_fee}
                      onChange={handleInputChange}
                      required 
                      min={0}
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Medical registration number</label>
                  <div className="input-icon-wrapper">
                    <Stethoscope className="field-icon" size={16} />
                    <input
                      type="text"
                      name="registration_number"
                      placeholder="e.g. MH-12345"
                      value={formData.registration_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>Subscription plan</label>
                    <div className="input-icon-wrapper">
                      <Calendar className="field-icon" size={16} />
                      <select
                        name="plan_id"
                        value={formData.plan_id > 0 ? String(formData.plan_id) : ''}
                        onChange={handleInputChange}
                        required
                        disabled={plansLoading || plans.length === 0}
                      >
                        {plansLoading ? (
                          <option value="">Loading plans…</option>
                        ) : plans.length === 0 ? (
                          <option value="">No plans available</option>
                        ) : (
                          plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    {plansError ? (
                      <p className="section-hint" role="status" style={{ color: 'var(--error, #c0392b)' }}>
                        {plansError}
                      </p>
                    ) : null}
                  </div>
                  <div className="input-group">
                    <label>Billing cycle</label>
                    <div className="input-icon-wrapper">
                      <Calendar className="field-icon" size={16} />
                      <select
                        name="billing_cycle"
                        value={formData.billing_cycle}
                        onChange={handleInputChange}
                      >
                        <option value="yearly">Yearly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-section" style={{ marginTop: '24px' }}>
                <div className="section-title">
                  <Lock size={18} />
                  <span>System Credentials</span>
                </div>
                <p className="section-hint">
                  Optional — not sent with this registration. Set access separately if your workflow
                  requires a portal password.
                </p>
                <div className="input-group">
                  <label>Login Password</label>
                  <div className="input-icon-wrapper">
                    <Lock className="field-icon" size={16} />
                    <input 
                      type="password" 
                      name="password" 
                      placeholder="••••••••" 
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Availability Column */}
            <div className="form-card-column">
              <div className="card-section">
                <div className="section-title">
                  <Mail size={18} />
                  <span>Contact Handshake</span>
                </div>
                <div className="input-group">
                  <label>Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail className="field-icon" size={16} />
                    <input 
                      type="email" 
                      name="email" 
                      placeholder="specialist@ayka.com" 
                      value={formData.email}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Primary Phone Channel</label>
                  <div className="input-icon-wrapper">
                    <Phone className="field-icon" size={16} />
                    <input 
                      type="tel" 
                      name="phone_number" 
                      placeholder="9876543210" 
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="card-section" style={{ marginTop: '24px' }}>
                <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} />
                    <span>Clinical Availability</span>
                  </div>
                  <button type="button" className="add-slot-btn" onClick={addAvailabilitySlot}>
                    <Plus size={14} />
                    <span>Add Slot</span>
                  </button>
                </div>
                
                <div className="availability-list">
                  {formData.availability.map((slot, index) => (
                    <div key={index} className="availability-slot-card animate-in">
                      <div className="slot-header">
                        <span className="slot-index">Slot #{index + 1}</span>
                        <button type="button" className="remove-slot" onClick={() => removeAvailabilitySlot(index)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="slot-row">
                        <select 
                          value={slot.day_of_week} 
                          onChange={(e) => handleAvailabilityChange(index, 'day_of_week', e.target.value)}
                        >
                          <option value={0}>Sunday</option>
                          <option value={1}>Monday</option>
                          <option value={2}>Tuesday</option>
                          <option value={3}>Wednesday</option>
                          <option value={4}>Thursday</option>
                          <option value={5}>Friday</option>
                          <option value={6}>Saturday</option>
                        </select>
                        <select 
                          value={slot.time_slot} 
                          onChange={(e) => handleAvailabilityChange(index, 'time_slot', e.target.value)}
                        >
                          <option value="morning">Morning</option>
                          <option value="afternoon">Afternoon</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                      <div className="slot-row">
                        <div className="time-input">
                          <label>Start</label>
                          <input 
                            type="time" 
                            value={slot.start_time} 
                            onChange={(e) => handleAvailabilityChange(index, 'start_time', e.target.value)}
                          />
                        </div>
                        <div className="time-input">
                          <label>End</label>
                          <input 
                            type="time" 
                            value={slot.end_time} 
                            onChange={(e) => handleAvailabilityChange(index, 'end_time', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions-fixed">
            <button type="button" className="btn-cancel" onClick={() => router.push('/doctors')}>
              Discard Registration
            </button>
            <button type="submit" className="btn-submit-premium" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <span>Commit Registration</span>
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
