"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Stethoscope,
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Briefcase,
  Zap,
  Loader2,
  X,
  Upload,
  Edit2,
  Trash2,
  Download,
  MessageSquare,
  Clock,
  Send,
  History,
  Target
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '@/utils/api';
import '../Leads.css';

function doctorLeadsBase(): string {
  if (typeof window === 'undefined') return '/api/v1/super-admin/leads/doctor-leads';
  const userType = localStorage.getItem('user_type');
  return userType === 'admin_staff'
    ? '/api/v1/admin-staff/leads/doctor-leads'
    : '/api/v1/super-admin/leads/doctor-leads';
}

type DoctorLeadRemarkApi = {
  id: number;
  remark_text: string;
  added_by_name: string;
  added_by_role: string;
  created_at: string;
};

type UiRemark = {
  id?: number;
  text: string;
  author: string;
  authorRole?: string;
  date: string;
  /** ISO from API when present — used to order same calendar day correctly */
  createdAt?: string;
};

function formatRemarkDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const slice = iso.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(slice) ? slice : iso;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function remarkApiToUi(r: DoctorLeadRemarkApi): UiRemark {
  const name = r.added_by_name?.trim() || '';
  const role = r.added_by_role?.trim();
  return {
    id: r.id,
    text: r.remark_text,
    author: name || role || '—',
    authorRole: name && role ? role : undefined,
    date: formatRemarkDateShort(r.created_at),
    createdAt: r.created_at || undefined,
  };
}

function normalizeRemarkRow(raw: unknown): UiRemark | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.remark_text === 'string') {
    return remarkApiToUi({
      id: typeof o.id === 'number' ? o.id : 0,
      remark_text: o.remark_text,
      added_by_name: typeof o.added_by_name === 'string' ? o.added_by_name : '',
      added_by_role: typeof o.added_by_role === 'string' ? o.added_by_role : '',
      created_at: typeof o.created_at === 'string' ? o.created_at : '',
    });
  }
  if (typeof o.text === 'string') {
    return {
      id: typeof o.id === 'number' ? o.id : undefined,
      text: o.text,
      author: typeof o.author === 'string' ? o.author : '—',
      date: typeof o.date === 'string' ? o.date : '',
      createdAt:
        typeof o.created_at === 'string' ? o.created_at : undefined,
    };
  }
  return null;
}

function remarkSortTimestamp(r: UiRemark): number {
  if (r.createdAt) {
    const t = new Date(r.createdAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const d = new Date(`${r.date}T12:00:00`).getTime();
  if (!Number.isNaN(d)) return d;
  return 0;
}

function sortRemarksNewestFirst(remarks: UiRemark[]): UiRemark[] {
  return [...remarks].sort((a, b) => {
    const ka = remarkSortTimestamp(a);
    const kb = remarkSortTimestamp(b);
    if (kb !== ka) return kb - ka;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

function parseRemarksListResponse(payload: unknown): UiRemark[] {
  let raw: UiRemark[] = [];
  if (Array.isArray(payload)) {
    raw = payload
      .map(normalizeRemarkRow)
      .filter((x): x is UiRemark => x != null);
  } else if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>;
    if (Array.isArray(p.data)) {
      raw = p.data
        .map(normalizeRemarkRow)
        .filter((x): x is UiRemark => x != null);
    } else if (Array.isArray(p.remarks)) {
      raw = p.remarks
        .map(normalizeRemarkRow)
        .filter((x): x is UiRemark => x != null);
    }
  }
  return sortRemarksNewestFirst(raw);
}

async function fetchDoctorLeadRemarksList(
  leadId: number | string,
): Promise<UiRemark[]> {
  const path = `${doctorLeadsBase()}/${encodeURIComponent(String(leadId))}/remarks`;
  const result = await api.get(path);
  return parseRemarksListResponse(result);
}

function remarksFromLeadPayload(lead: Record<string, unknown>): UiRemark[] {
  const raw = lead.remarks ?? lead.remarks_history ?? lead.remark_log;
  if (!Array.isArray(raw)) return [];
  return sortRemarksNewestFirst(
    raw.map(normalizeRemarkRow).filter((x): x is UiRemark => x != null),
  );
}

function extractCreatedRemark(payload: unknown): DoctorLeadRemarkApi | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (
    typeof p.remark_text === 'string' &&
    (typeof p.id === 'number' || typeof p.id === 'string')
  ) {
    return {
      id: typeof p.id === 'number' ? p.id : Number(p.id) || 0,
      remark_text: p.remark_text,
      added_by_name:
        typeof p.added_by_name === 'string' ? p.added_by_name : '',
      added_by_role:
        typeof p.added_by_role === 'string' ? p.added_by_role : '',
      created_at: typeof p.created_at === 'string' ? p.created_at : '',
    };
  }
  const data = p.data;
  if (data && typeof data === 'object') {
    return extractCreatedRemark(data);
  }
  return null;
}

function leadRowId(lead: { id?: unknown; lead_id?: unknown }): string | number | null {
  const raw = lead?.id ?? lead?.lead_id;
  if (raw == null || raw === '') return null;
  return typeof raw === 'number' || typeof raw === 'string' ? raw : null;
}

type DeleteLeadResponse = {
  success?: boolean;
  message?: string;
};

export default function DoctorLeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ skip: 0, limit: 50, total: 0 });
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [newRemark, setNewRemark] = useState('');
  const [remarksLoading, setRemarksLoading] = useState(false);
  const [remarkSubmitting, setRemarkSubmitting] = useState(false);
  const [remarkError, setRemarkError] = useState('');

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        skip: pagination.skip.toString(),
        limit: pagination.limit.toString()
      });
      if (searchTerm) queryParams.append('search', searchTerm);

      const result = await api.get(`${doctorLeadsBase()}?${queryParams}`);
      if (result && result.success && result.data) {
        const data = result.data as Record<string, unknown>;
        const list = (Array.isArray(data.leads) ? data.leads : []) as any[];
        const totalRaw = data.total;
        const total =
          typeof totalRaw === 'number'
            ? totalRaw
            : typeof totalRaw === 'string'
              ? Number(totalRaw) || 0
              : 0;
        const leadsWithHistory = list.map((l: any) => ({
          ...l,
          remarks_history: remarksFromLeadPayload(l as Record<string, unknown>),
        }));
        setLeads(leadsWithHistory);
        setPagination((prev) => ({ ...prev, total }));
      }
    } catch (error) {
       // Fallback mock data for development visibility
       setLeads([
          {
            id: 201,
            name: 'Dr. Sameer Khanna',
            number: '+91 91234 56789',
            email: 'dr.khanna@clinic.com',
            speciality: 'Cardiologist',
            city: 'Delhi',
            state: 'Delhi',
            status: 'In-Progress',
            remarks_history: [],
          },
          {
            id: 202,
            name: 'Dr. Ananya Iyer',
            number: '+91 82345 67890',
            email: 'ananya.iyer@health.in',
            speciality: 'Dermatologist',
            city: 'Bangalore',
            state: 'Karnataka',
            status: 'New',
            remarks_history: [],
          },
       ]);
    } finally {
      setLoading(false);
    }
  }, [pagination.skip, pagination.limit, searchTerm]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const applyRemarksToLead = (
    leadId: string | number,
    remarks: UiRemark[],
  ) => {
    setSelectedLead((prev: any) =>
      prev && String(leadRowId(prev) ?? prev.id) === String(leadId)
        ? { ...prev, remarks_history: remarks }
        : prev,
    );
    setLeads((prev) =>
      prev.map((l) =>
        String(leadRowId(l) ?? l.id) === String(leadId)
          ? { ...l, remarks_history: remarks }
          : l,
      ),
    );
  };

  const handleDeleteDoctorLead = async (lead: any) => {
    const leadId = leadRowId(lead) ?? lead?.id;
    if (leadId == null) {
      alert('Missing lead id.');
      return;
    }

    const displayName =
      typeof lead.name === 'string' && lead.name.trim()
        ? lead.name.trim()
        : 'this lead';
    if (
      !window.confirm(
        `Permanently delete ${displayName}? This cannot be undone.`,
      )
    ) {
      return;
    }

    const key = String(leadId);
    setDeletingLeadId(key);
    try {
      const path = `${doctorLeadsBase()}/${encodeURIComponent(String(leadId))}`;
      const result = await api.delete<DeleteLeadResponse>(path);

      if (result.success === false) {
        alert(
          typeof result.message === 'string'
            ? result.message
            : 'Could not delete lead.',
        );
        return;
      }

      setLeads((prev) =>
        prev.filter((l) => String(leadRowId(l) ?? l.id) !== key),
      );
      setPagination((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));

      setSelectedLead((prev: any) => {
        if (prev && String(leadRowId(prev) ?? prev.id) === key) {
          setShowRemarksModal(false);
          return null;
        }
        return prev;
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not delete lead.');
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleOpenRemarks = async (lead: any) => {
    const id = leadRowId(lead) ?? lead?.id;
    if (id == null) return;
    setRemarkError('');
    setSelectedLead(lead);
    setShowRemarksModal(true);
    setRemarksLoading(true);
    try {
      const ui = await fetchDoctorLeadRemarksList(id);
      applyRemarksToLead(id, ui);
    } catch {
      applyRemarksToLead(id, []);
    } finally {
      setRemarksLoading(false);
    }
  };

  const handleAddRemark = async () => {
    const text = newRemark.trim();
    const leadId = selectedLead ? (leadRowId(selectedLead) ?? selectedLead.id) : null;
    if (!text || leadId == null) return;

    setRemarkSubmitting(true);
    setRemarkError('');
    try {
      const path = `${doctorLeadsBase()}/${encodeURIComponent(String(leadId))}/remarks`;
      const payload = await api.post(path, { remark_text: text });
      const created = extractCreatedRemark(payload);
      if (!created) {
        throw new Error('Unexpected response when saving remark.');
      }
      try {
        const ui = await fetchDoctorLeadRemarksList(leadId);
        applyRemarksToLead(leadId, ui);
      } catch {
        const ui = remarkApiToUi(created);
        const prev = selectedLead.remarks_history || [];
        applyRemarksToLead(
          leadId,
          sortRemarksNewestFirst([
            ...prev.filter((r: UiRemark) => r.id !== ui.id),
            ui,
          ]),
        );
      }
      setNewRemark('');
    } catch (e: unknown) {
      setRemarkError(e instanceof Error ? e.message : 'Could not post remark.');
    } finally {
      setRemarkSubmitting(false);
    }
  };

  const handleDownloadDoctorLeadsExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const limit = 100;
      let skip = 0;
      const all: any[] = [];
      let total = Number.POSITIVE_INFINITY;
      const base = doctorLeadsBase();

      while (true) {
        const queryParams = new URLSearchParams({
          skip: String(skip),
          limit: String(limit),
        });
        if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());

        const result = await api.get(`${base}?${queryParams}`);
        if (!result || !result.success || !result.data) break;

        const data = result.data as Record<string, unknown>;
        const list = (Array.isArray(data.leads) ? data.leads : []) as any[];
        const totalRaw = data.total;
        const t =
          typeof totalRaw === 'number'
            ? totalRaw
            : typeof totalRaw === 'string'
              ? Number(totalRaw) || 0
              : 0;
        if (Number.isFinite(t)) total = t;

        const normalized = list.map((l: any) => ({
          ...l,
          remarks_history: remarksFromLeadPayload(l as Record<string, unknown>),
        }));
        all.push(...normalized);

        if (list.length === 0) break;
        if (all.length >= total) break;
        skip += limit;
      }

      if (all.length === 0) {
        window.alert('No doctor leads to export for the current filters.');
        return;
      }

      const REMARK_BATCH = 12;
      for (let i = 0; i < all.length; i += REMARK_BATCH) {
        const batch = all.slice(i, i + REMARK_BATCH);
        await Promise.all(
          batch.map(async (lead) => {
            const id = leadRowId(lead) ?? lead?.id;
            if (id == null) return;
            try {
              const remarks = await fetchDoctorLeadRemarksList(id);
              lead.remarks_history = remarks;
            } catch {
              /* keep list payload remarks if any */
            }
          }),
        );
      }

      const rows = all.map((lead) => {
        const hist = (lead.remarks_history || []) as UiRemark[];
        const latest = hist.length > 0 ? hist[0] : null;
        const remarksFull = hist
          .map(
            (r) =>
              `[${r.date}] ${r.author}${r.authorRole ? ` (${r.authorRole})` : ''}: ${r.text}`,
          )
          .join('\n');

        const lid = leadRowId(lead) ?? lead?.id ?? '';

        const row: Record<string, string | number> = {
          'Lead ID': lid,
          Name: lead.name ?? '',
          Speciality:
            lead.speciality ??
            lead.specialization ??
            lead.specialisation ??
            '',
          City: lead.city ?? '',
          State: lead.state ?? '',
          Phone: lead.number ?? lead.phone ?? lead.phone_number ?? '',
          Email: lead.email ?? '',
          Status: lead.status ?? '',
          'Latest remark': latest ? String(latest.text) : '',
          'Remarks (full history)': remarksFull,
        };

        const skipKeys = new Set([
          'id',
          'lead_id',
          'name',
          'speciality',
          'specialization',
          'specialisation',
          'city',
          'state',
          'number',
          'phone',
          'phone_number',
          'email',
          'status',
          'remarks_history',
          'remarks',
          'remark_log',
        ]);
        for (const key of Object.keys(lead)) {
          if (skipKeys.has(key)) continue;
          const v = lead[key];
          if (v == null) continue;
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            row[key] = v as string | number;
          }
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Doctor leads');
      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `doctor-leads-${date}.xlsx`);
    } catch (e: unknown) {
      console.error('Doctor leads Excel export failed:', e);
      window.alert(
        e instanceof Error ? e.message : 'Could not generate the Excel file.',
      );
    } finally {
      setExportingExcel(false);
    }
  }, [searchTerm]);

  return (
    <div className="page-container leads-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Talent Leads</h1>
          <p className="page-subtitle">Strategic recruitment pipeline for individual healthcare professionals and specialists.</p>
        </div>
        <div className="header-actions">
           <button
             type="button"
             className="btn btn-secondary"
             onClick={() => void handleDownloadDoctorLeadsExcel()}
             disabled={exportingExcel}
             title="Download all doctor (expert) leads as Excel (.xlsx)"
             style={{ display: 'flex', alignItems: 'center', gap: 8 }}
           >
             {exportingExcel ? (
               <Loader2 size={18} className="animate-spin" />
             ) : (
               <Download size={18} />
             )}
             <span>{exportingExcel ? 'Exporting…' : 'Download'}</span>
           </button>
           <button className="btn btn-primary" onClick={() => router.push('/leads/doctors/new')}>
              <Plus size={18} />
              Add Practitioner
           </button>
        </div>
      </div>

      <div className="leads-stats">
         <div className="card lead-stat-card">
            <Target className="stat-icon" /><div className="stat-info"><span className="stat-value">{pagination.total || 158}</span><span className="stat-label">Total Pipeline</span></div>
         </div>
         <div className="card lead-stat-card">
            <UserCheck className="stat-icon" style={{ color: '#10b981' }} /><div className="stat-info"><span className="stat-value">42</span><span className="stat-label">Active Conversion</span></div>
         </div>
         <div className="card lead-stat-card">
            <TrendingUp className="stat-icon" style={{ color: '#f59e0b' }} /><div className="stat-info"><span className="stat-value">18%</span><span className="stat-label">Conv. Rate</span></div>
         </div>
      </div>

      <div className="card table-card">
         <table className="data-table">
            <thead>
               <tr>
                  <th>Practitioner Identity</th>
                  <th>Clinical Details</th>
                  <th>Recent Remark</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Management</th>
               </tr>
            </thead>
            <tbody>
               {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}><Loader2 className="animate-spin" /></td></tr>
               ) : leads.map((lead) => {
                  const hist = lead.remarks_history as UiRemark[] | undefined;
                  const latestRemark =
                    hist && hist.length > 0 ? hist[0] : null;
                  const rowKey = String(leadRowId(lead) ?? lead.id);
                  return (
                  <tr key={rowKey}>
                     <td>
                        <div className="lead-identity-group">
                           <div className="lead-avatar"><Stethoscope size={18} /></div>
                           <div className="contact-info">
                              <span className="contact-main">{lead.name}</span>
                              <span className="contact-sub">{lead.city}{lead.state ? `, ${lead.state}` : ''}</span>
                           </div>
                        </div>
                     </td>
                     <td>
                        <div className="contact-info">
                           <span className="contact-main">{lead.speciality || 'Generalist'}</span>
                           <span className="contact-sub">{lead.number} | {lead.email}</span>
                        </div>
                     </td>
                     <td>
                        <div className="remarks-summary-box" onClick={() => void handleOpenRemarks(lead)} style={{ cursor: 'pointer' }}>
                           <div className="recent-remark-text">
                              <MessageSquare size={12} style={{ color: '#2A4638', flexShrink: 0 }} />
                              <span>{latestRemark?.text || 'Add first remark...'}</span>
                           </div>
                           {hist && hist.length > 1 && (
                              <span className="history-count">+{hist.length - 1} more</span>
                           )}
                        </div>
                     </td>
                     <td><span className={`badge badge-${(lead.status || 'New').toLowerCase() === 'new' ? 'info' : 'success'}`}>{lead.status || 'New'}</span></td>
                     <td style={{ textAlign: 'right' }}>
                        <div className="table-actions">
                           <button type="button" className="action-btn" onClick={() => void handleOpenRemarks(lead)} title="History & Remarks"><History size={16} /></button>
                           <button type="button" className="action-btn" onClick={() => router.push(`/leads/doctors/details?id=${lead.id}`)}><Edit2 size={16} /></button>
                           <button
                             type="button"
                             className="action-btn text-danger"
                             title="Delete lead permanently"
                             disabled={deletingLeadId === rowKey}
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               void handleDeleteDoctorLead(lead);
                             }}
                           >
                             {deletingLeadId === rowKey ? (
                               <Loader2 size={16} className="animate-spin" />
                             ) : (
                               <Trash2 size={16} />
                             )}
                           </button>
                        </div>
                     </td>
                  </tr>
                  );
               })}
            </tbody>
         </table>
      </div>

      {/* Remarks Management Modal */}
      {showRemarksModal && selectedLead && (
        <div className="modal-overlay">
           <div className="modal-content remarks-modal animate-in" style={{ maxWidth: '600px' }}>
              <div className="modal-header">
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar-mini"><Stethoscope size={16} /></div>
                    <div>
                       <h3 className="modal-title">{selectedLead.name}</h3>
                       <span style={{ fontSize: '12px', color: '#64748b' }}>Individual Practitioner Lead History</span>
                    </div>
                 </div>
                 <button className="btn-close" onClick={() => { setShowRemarksModal(false); setRemarkError(''); }}><X size={20} /></button>
              </div>
              
              <div className="remarks-modal-body">
                 <div className="remarks-modal-composer">
                    <div className="remark-input-area">
                      <textarea 
                         className="form-input" 
                         placeholder="Log recruitment progress or specialist requirements..." 
                         value={newRemark}
                         onChange={e => setNewRemark(e.target.value)}
                         disabled={remarkSubmitting}
                         style={{ borderRadius: '12px', padding: '14px' }}
                      />
                      {remarkError && (
                        <p role="alert" style={{ color: '#b91c1c', fontSize: 13, marginTop: 8 }}>{remarkError}</p>
                      )}
                      <button
                         type="button"
                         className="btn btn-primary"
                         disabled={remarkSubmitting || !newRemark.trim()}
                         onClick={() => void handleAddRemark()}
                         style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}
                      >
                         {remarkSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                         <span>{remarkSubmitting ? 'Posting…' : 'Post Remark'}</span>
                      </button>
                    </div>
                 </div>

                 <div className="remarks-modal-scroll">
                 <div className="remarks-timeline">
                    {remarksLoading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: '#64748b', fontSize: 14 }}>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Loading remarks…</span>
                      </div>
                    )}
                    {!remarksLoading &&
                      (!selectedLead.remarks_history ||
                        selectedLead.remarks_history.length === 0) && (
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                          No remarks yet. Add one above.
                        </p>
                      )}
                    {selectedLead.remarks_history?.map((remark: UiRemark, i: number) => (
                       <div key={remark.id != null ? `r-${remark.id}` : `i-${i}`} className="timeline-item">
                          <div className="timeline-marker"></div>
                          <div className="remark-card-mini">
                             <div className="remark-header-mini">
                                <div>
                                  <span className="author">{remark.author}</span>
                                  {remark.authorRole ? (
                                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 600 }}>
                                      {remark.authorRole}
                                    </div>
                                  ) : null}
                                </div>
                                <span className="date"><Clock size={10} /> {remark.date}</span>
                             </div>
                             <p className="remark-text-bubble">{remark.text}</p>
                          </div>
                       </div>
                    ))}
                 </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
