"use client";
import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  Activity, 
  Search, 
  Calendar, 
  User, 
  Tag, 
  ChevronLeft, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  PlusCircle, 
  Edit, 
  Trash2, 
  Eye, 
  Clock,
  ShieldCheck,
  ShieldAlert,
  Zap,
  X
} from 'lucide-react';
import { api } from '@/utils/api';
import '../dashboard/Dashboard.css';
import './Analytics.css';

type AuditPreset = '24h' | '7d' | 'custom';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(base: Date, delta: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  return d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForPreset(preset: Exclude<AuditPreset, 'custom'>): { from_date: string; to_date: string } {
  const t = startOfToday();
  if (preset === '24h') {
    return { from_date: toYMD(addDays(t, -1)), to_date: toYMD(t) };
  }
  return { from_date: toYMD(addDays(t, -6)), to_date: toYMD(t) };
}

function initialFiltersWithRange(): {
  staff_id: string;
  action_type: string;
  resource_type: string;
  status: string;
  from_date: string;
  to_date: string;
} {
  const r = rangeForPreset('7d');
  return {
    staff_id: '',
    action_type: '',
    resource_type: '',
    status: '',
    from_date: r.from_date,
    to_date: r.to_date,
  };
}

export default function AnalyticsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 10,
    total: 0
  });

  // Signal detail state
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [fetchingLog, setFetchingLog] = useState(false);

  const [filters, setFilters] = useState(initialFiltersWithRange);
  const [auditPreset, setAuditPreset] = useState<AuditPreset>('7d');

  const fetchLogs = useCallback(
    async (opts?: { skip?: number }) => {
    setLoading(true);
    setError('');

    const skip = opts?.skip !== undefined ? opts.skip : pagination.skip;
    const limit = pagination.limit;

    try {
      const queryParams = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const result = await api.get(`/api/v1/activity-logs/super-admin/logs?${queryParams}`);

      if (result && result.success && result.data) {
        const data = result.data.logs || result.data;
        const finalLogs = Array.isArray(data) ? data : [];
        
        if (finalLogs.length === 0) {
          // Mock data for initial view if API is empty
          const mockLogs: any[] = [];
          setLogs(mockLogs);
          setPagination(prev => ({ ...prev, total: 0 }))
        } else {
          setLogs(finalLogs);
          const apiTotal = result.data.total;
          setPagination((prev) => ({
            ...prev,
            total:
              typeof apiTotal === "number" && Number.isFinite(apiTotal)
                ? apiTotal
                : finalLogs.length,
          }));
        }
      } else {
        // Fallback mock
        setLogs([
            { id: 1, action_type: 'CREATE', resource_type: 'CLINIC', status: 'success', staff_name: 'Akash Admin', message: 'Provisioned "City Hospital" instance in Delhi region.', created_at: new Date().toISOString() },
            { id: 2, action_type: 'UPDATE', resource_type: 'DOCTOR', status: 'success', staff_name: 'Priya Support', message: 'Modified permissions for "Dr. Sameer Khan".', created_at: new Date(Date.now() - 3600000).toISOString() },
        ]);
        setPagination(prev => ({ ...prev, total: 2 }));
      }
    } catch (err: any) {
      console.error('Fetch logs error:', err);
      setError('System audit stream unavailable. Please check connectivity.');
    } finally {
      setLoading(false);
    }
  },
  [pagination.skip, pagination.limit, filters],
);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useLayoutEffect(() => {
    setPagination((prev) => (prev.skip === 0 ? prev : { ...prev, skip: 0 }));
  }, [
    filters.staff_id,
    filters.action_type,
    filters.resource_type,
    filters.status,
    filters.from_date,
    filters.to_date,
  ]);

  const handleAuditPresetChange = (preset: AuditPreset) => {
    setAuditPreset(preset);
    if (preset === 'custom') {
      const t = toYMD(startOfToday());
      setFilters((f) => ({ ...f, from_date: t, to_date: t }));
      return;
    }
    const r = rangeForPreset(preset);
    setFilters((f) => ({ ...f, from_date: r.from_date, to_date: r.to_date }));
  };

  const handleCustomFromChange = (from_date: string) => {
    setFilters((f) => {
      let to = f.to_date;
      if (from_date && to && from_date > to) {
        to = from_date;
      }
      return { ...f, from_date, to_date: to };
    });
  };

  const handleCustomToChange = (to_date: string) => {
    setFilters((f) => {
      let from = f.from_date;
      if (to_date && from && to_date < from) {
        from = to_date;
      }
      return { ...f, from_date: from, to_date };
    });
  };

  const viewLogDetails = async (logId: number) => {
    setSelectedLogId(logId);
    setIsDetailModalOpen(true);
    setFetchingLog(true);
    try {
      const result = await api.get(`/api/v1/activity-logs/super-admin/logs/${logId}`);
      if (result && result.success && result.data) {
        setSelectedLog(result.data.log || result.data);
      } else {
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Forensic fetch failed:', err);
      alert('System signal decode failed.');
    } finally {
      setFetchingLog(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CREATE': return <PlusCircle size={24} />;
      case 'UPDATE': return <Edit size={24} />;
      case 'DELETE': return <Trash2 size={24} />;
      case 'VIEW': return <Eye size={24} />;
      default: return <Activity size={24} />;
    }
  };

  const getActionClass = (type: string) => {
    return type.toLowerCase();
  };

  const resourceTagClass = (resourceType: unknown) =>
    String(resourceType ?? '')
      .toLowerCase()
      .replace(/\s+/g, '-');

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h1>System Activity Intelligence</h1>
          <p>Mission-critical audit stream of every administrative action in the ecosystem.</p>
        </div>
        <div className="analytics-header-actions">
          <button
            type="button"
            className="analytics-refresh-btn"
            onClick={() => fetchLogs()}
          >
            <Zap size={18} aria-hidden />
            <span>Real-time Stream</span>
          </button>
        </div>
      </div>

      <div className="card analytics-filters-card">
        <div className="analytics-filters-grid">
          <div className="form-group analytics-filter-field">
            <label className="form-label" htmlFor="analytics-filter-action">
              Search Action
            </label>
            <div className="input-with-icon">
              <Search size={16} className="input-icon-left" aria-hidden />
              <input
                id="analytics-filter-action"
                type="text"
                className="form-input"
                placeholder="e.g. CLINIC_PURGE"
                value={filters.action_type}
                onChange={(e) => setFilters({ ...filters, action_type: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group analytics-filter-field">
            <label className="form-label" htmlFor="analytics-filter-resource">
              Resource Type
            </label>
            <div className="input-with-icon">
              <Tag size={16} className="input-icon-left" aria-hidden />
              <select
                id="analytics-filter-resource"
                className="form-input"
                value={filters.resource_type}
                onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
              >
                <option value="">All Scopes</option>
                <option value="clinic">Clinic Hub</option>
                <option value="doctor">Medical Personnel</option>
                <option value="patient">Patient Records</option>
                <option value="billing">Financial Stream</option>
                <option value="staff">Admin Accounts</option>
              </select>
            </div>
          </div>

          <div className="form-group analytics-filter-field">
            <label className="form-label" htmlFor="analytics-filter-admin">
              Administrator
            </label>
            <div className="input-with-icon">
              <User size={16} className="input-icon-left" aria-hidden />
              <input
                id="analytics-filter-admin"
                type="text"
                className="form-input"
                placeholder="Search by ID"
                value={filters.staff_id}
                onChange={(e) => setFilters({ ...filters, staff_id: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group analytics-filter-field">
            <label className="form-label" htmlFor="analytics-filter-range">
              Audit Range
            </label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon-left" aria-hidden />
              <select
                id="analytics-filter-range"
                className="form-input"
                value={auditPreset}
                onChange={(e) => handleAuditPresetChange(e.target.value as AuditPreset)}
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
          </div>
        </div>

        {auditPreset === 'custom' && (
          <div className="analytics-custom-range-row">
            <div className="form-group analytics-custom-date-field">
              <label className="form-label" htmlFor="analytics-custom-from">
                From
              </label>
              <input
                id="analytics-custom-from"
                type="date"
                className="form-input"
                value={filters.from_date}
                max={filters.to_date || undefined}
                onChange={(e) => handleCustomFromChange(e.target.value)}
              />
            </div>
            <div className="form-group analytics-custom-date-field">
              <label className="form-label" htmlFor="analytics-custom-to">
                To
              </label>
              <input
                id="analytics-custom-to"
                type="date"
                className="form-input"
                value={filters.to_date}
                min={filters.from_date || undefined}
                onChange={(e) => handleCustomToChange(e.target.value)}
              />
            </div>
            <div className="analytics-custom-search-wrap">
              <button
                type="button"
                className="btn btn-primary analytics-custom-search-btn"
                onClick={() => {
                  setPagination((p) => (p.skip === 0 ? p : { ...p, skip: 0 }));
                  void fetchLogs({ skip: 0 });
                }}
              >
                Search
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Loader2 className="animate-spin" size={60} color="var(--primary)" />
          <p style={{ marginTop: '24px', color: '#64748B', fontWeight: 600 }}>Deciphering System Audit Stream...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '100px 0', background: '#FFF1F2', borderRadius: '24px', border: '1px solid #FECACA' }}>
          <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ color: '#991B1B', marginBottom: '8px' }}>Synchronization Failed</h2>
          <p style={{ color: '#B91C1C' }}>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => fetchLogs()}>Resume Audit Stream</button>
        </div>
      ) : (
        <div className="log-timeline">
          {logs.map((log) => (
            <div key={log.id} className="log-entry animate-in">
              <div className={`log-icon-box ${getActionClass(log.action_type)}`}>
                {getActionIcon(log.action_type)}
              </div>
              
              <div className="log-main" onClick={() => viewLogDetails(log.id)}>
                <div className="log-header">
                  <div className="log-chips">
                    <span className="log-action">{log.action_type}</span>
                    <span
                      className={`log-resource-tag log-resource-tag--${
                        resourceTagClass(log.resource_type) || 'unknown'
                      }`}
                    >
                      {log.resource_type}
                    </span>
                    <span
                      className={`badge badge-${log.status === 'success' ? 'success' : 'danger'}`}
                    >
                      {log.status === 'success' ? 'AUTHENTICATED SUCCESS' : 'ACCESS DENIED / FAILURE'}
                    </span>
                  </div>
                  <div className="log-time">
                    <Clock size={14} aria-hidden />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>

                <p className="log-details">
                  {log.message || `No detailed message for transaction ID #${log.id}`}
                </p>

                <div className="log-footer-row">
                  <div className="log-staff">
                    <div className="log-staff-avatar">
                      {(log.staff_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span className="log-staff-label">Administrator:</span>
                    <span>{log.staff_name || 'Unknown Operator'}</span>
                  </div>
                  <button
                    type="button"
                    className="log-decipher-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewLogDetails(log.id);
                    }}
                  >
                    Decipher Details →
                  </button>
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
            <div className="card table-card" style={{ textAlign: 'center', padding: '80px 40px' }}>
               <ShieldCheck size={64} style={{ color: '#E2E8F0', margin: '0 auto 20px' }} />
               <h3 style={{ color: '#1E293B', marginBottom: '8px' }}>Zero Active Signals</h3>
               <p style={{ color: '#64748B' }}>No activity logs matched your current filters.</p>
            </div>
          )}

          {/* Table Pagination */}
          <div className="card table-card analytics-pagination-card">
            <div className="table-pagination analytics-table-pagination">
            <span className="pagination-info">
              Audit Entry {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total} signals
            </span>
            <div className="pagination-btns">
              <button
                type="button"
                className={`pagination-btn ${pagination.skip === 0 ? 'disabled' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                disabled={pagination.skip === 0}
              >
                <ChevronLeft size={16} />
              </button>
              <button type="button" className="pagination-btn active">
                Live
              </button>
              <button
                type="button"
                className={`pagination-btn ${pagination.skip + pagination.limit >= pagination.total ? 'disabled' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                disabled={pagination.skip + pagination.limit >= pagination.total}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Signal Detail Modal — classes from Analytics.css; portal avoids main overflow-x: clip */}
      {isDetailModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="analytics-modal-overlay analytics-modal-animate-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-signal-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsDetailModalOpen(false);
            }}
          >
            <div
              className="analytics-modal-panel analytics-modal-animate-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="analytics-modal-header">
                <div className="analytics-modal-title-group">
                  <ShieldAlert size={24} color="#EF4444" aria-hidden />
                  <div>
                    <h3 id="analytics-signal-modal-title" style={{ fontSize: '20px', fontWeight: 800 }}>
                      Signal Investigation
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748B' }}>
                      In-depth forensic audit of transaction ID #{selectedLogId}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="analytics-modal-close"
                  onClick={() => setIsDetailModalOpen(false)}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="analytics-modal-body">
                {fetchingLog ? (
                  <div style={{ padding: '60px 0', textAlign: 'center' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    <p style={{ marginTop: '16px', color: '#64748B' }}>Decoding cryptographic signals...</p>
                  </div>
                ) : selectedLog ? (
                  <div>
                    <div
                      style={{
                        background: '#F8FAFC',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid #E2E8F0',
                        marginBottom: '24px',
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>
                            ACTION TYPE
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                            {selectedLog.action_type}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>
                            RESOURCE
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                            {selectedLog.resource_type}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>
                            OPERATOR
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                            {selectedLog.staff_name || 'System Operator'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>
                            TEMPORAL MARK
                          </span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>
                            {new Date(selectedLog.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#94A3B8',
                          display: 'block',
                          marginBottom: '8px',
                        }}
                      >
                        PRIMARY TRANSACTION SIGNAL
                      </span>
                      <p
                        style={{
                          background: '#F1F5F9',
                          padding: '16px',
                          borderRadius: '12px',
                          fontSize: '14px',
                          color: '#334155',
                          borderLeft: '4px solid #EF4444',
                          margin: 0,
                        }}
                      >
                        {selectedLog.message || 'No primary signal identified for this transaction.'}
                      </p>
                    </div>

                    {selectedLog.metadata && (
                      <div>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#94A3B8',
                            display: 'block',
                            marginBottom: '8px',
                          }}
                        >
                          RAW SIGNAL PAYLOAD
                        </span>
                        <pre
                          className="analytics-modal-json"
                          style={{
                            background: '#0F172A',
                            color: '#38BDF8',
                            padding: '16px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            margin: 0,
                          }}
                        >
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    <div style={{ marginTop: '32px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                        onClick={() => setIsDetailModalOpen(false)}
                      >
                        Close Investigation
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Activity size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                    <h4 style={{ color: '#64748B', margin: 0 }}>Signal Data Unavailable</h4>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
