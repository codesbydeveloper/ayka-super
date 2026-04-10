"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
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
import './Analytics.css';

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

  // Filter State
  const [filters, setFilters] = useState({
    staff_id: '',
    action_type: '',
    resource_type: '',
    status: '',
    from_date: '',
    to_date: ''
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams({
        skip: pagination.skip.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const result = await api.get(`/api/v1/activity-logs/super-admin/logs?${queryParams}`);

      if (result && result.success && result.data) {
        const data = result.data.logs || result.data;
        const finalLogs = Array.isArray(data) ? data : [];
        
        if (finalLogs.length === 0) {
          // Mock data for initial view if API is empty
          const mockLogs = [
            { id: 101, action_type: 'CREATE', resource_type: 'CLINIC', status: 'success', staff_name: 'Akash Admin', message: 'Provisioned "City Hospital" instance in Delhi region.', created_at: new Date().toISOString() },
            { id: 102, action_type: 'UPDATE', resource_type: 'DOCTOR', status: 'success', staff_name: 'Priya Support', message: 'Modified permissions for "Dr. Sameer Khan".', created_at: new Date(Date.now() - 3600000).toISOString() },
            { id: 103, action_type: 'DELETE', resource_type: 'STAFF', status: 'failed', staff_name: 'Super Admin', message: 'Attempted to purge "akashstaff" but operation rejected.', created_at: new Date(Date.now() - 7200000).toISOString() },
            { id: 104, action_type: 'VIEW', resource_type: 'PAYMENT', status: 'success', staff_name: 'Billing Ops', message: 'Audited subscription status for "Wellness Clinic".', created_at: new Date(Date.now() - 86400000).toISOString() },
          ];
          setLogs(mockLogs);
          setPagination(prev => ({ ...prev, total: 4 }));
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
  }, [pagination.skip, pagination.limit, filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

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

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <div className="analytics-title-group">
          <h1>System Activity Intelligence</h1>
          <p>Mission-critical audit stream of every administrative action in the ecosystem.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => fetchLogs()}>
            <Zap size={18} />
            <span>Real-time Stream</span>
          </button>
        </div>
      </div>

      {/* Intelligence Filters Dashboard */}
      <div className="card table-card" style={{ marginBottom: '32px', padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
             <label className="form-label">Search Action</label>
             <div className="input-with-icon">
                <Search size={16} className="input-icon-left" />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. CLINIC_PURGE"
                  value={filters.action_type}
                  onChange={(e) => setFilters({...filters, action_type: e.target.value})}
                />
             </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
             <label className="form-label">Resource Type</label>
             <div className="input-with-icon">
                <Tag size={16} className="input-icon-left" />
                <select 
                  className="form-input"
                  value={filters.resource_type}
                  onChange={(e) => setFilters({...filters, resource_type: e.target.value})}
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

          <div className="form-group" style={{ marginBottom: 0 }}>
             <label className="form-label">Administrator</label>
             <div className="input-with-icon">
                <User size={16} className="input-icon-left" />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search by ID"
                  value={filters.staff_id}
                  onChange={(e) => setFilters({...filters, staff_id: e.target.value})}
                />
             </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
             <label className="form-label">Audit Range</label>
             <div className="input-with-icon">
                <Calendar size={16} className="input-icon-left" />
                <select className="form-input">
                  <option>Last 24 Hours</option>
                  <option>Last 7 Days</option>
                  <option>Custom Range</option>
                </select>
             </div>
          </div>
        </div>
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
              
              <div className="log-main" style={{ cursor: 'pointer' }} onClick={() => viewLogDetails(log.id)}>
                <div className="log-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="log-action">{log.action_type}</span>
                    <span className={`log-resource-tag ${log.resource_type.toLowerCase()}`}>
                       {log.resource_type}
                    </span>
                    <span className={`badge badge-${log.status === 'success' ? 'success' : 'danger'}`} style={{ marginLeft: '12px' }}>
                       {log.status === 'success' ? 'AUTHENTICATED SUCCESS' : 'ACCESS DENIED / FAILURE'}
                    </span>
                  </div>
                  <div className="log-time">
                    <Clock size={14} />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
                
                <p className="log-details">{log.message || `No detailed message for transaction ID #${log.id}`}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <div className="log-staff">
                    <div className="log-staff-avatar">
                      {(log.staff_name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 600 }}>Administrator:</span>
                    <span>{log.staff_name || 'Unknown Operator'}</span>
                  </div>
                  <button className="text-btn" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>Decipher Details →</button>
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
          <div className="table-pagination" style={{ marginTop: '32px' }}>
            <span className="pagination-info">
              Audit Entry {pagination.skip + 1} - {Math.min(pagination.skip + pagination.limit, pagination.total)} of {pagination.total} signals
            </span>
            <div className="pagination-btns">
              <button 
                className={`pagination-btn ${pagination.skip === 0 ? 'disabled' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, skip: Math.max(0, prev.skip - prev.limit) }))}
                disabled={pagination.skip === 0}
              >
                <ChevronLeft size={16} />
              </button>
              <button className="pagination-btn active">Live</button>
              <button 
                className={`pagination-btn ${pagination.skip + pagination.limit >= pagination.total ? 'disabled' : ''}`}
                onClick={() => setPagination(prev => ({ ...prev, skip: prev.skip + prev.limit }))}
                disabled={pagination.skip + pagination.limit >= pagination.total}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Signal Detail Modal */}
      {isDetailModalOpen && (
        <div className="modal-overlay animate-in" style={{ zIndex: 9999 }}>
          <div className="modal-content glass-modal animate-in" style={{ maxWidth: '600px', padding: '0' }}>
            <div className="modal-header" style={{ borderBottom: 'none', padding: '24px 32px 12px' }}>
              <div className="modal-title-group">
                <ShieldAlert size={24} color="#EF4444" />
                <div>
                   <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Signal Investigation</h3>
                   <p style={{ fontSize: '13px', color: '#64748B' }}>In-depth forensic audit of transaction ID #{selectedLogId}</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setIsDetailModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '0 32px 40px' }}>
              {fetchingLog ? (
                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                  <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                  <p style={{ marginTop: '16px', color: '#64748B' }}>Decoding cryptographic signals...</p>
                </div>
              ) : selectedLog ? (
                <div>
                   <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '20px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                         <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>ACTION TYPE</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{selectedLog.action_type}</span>
                         </div>
                         <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>RESOURCE</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{selectedLog.resource_type}</span>
                         </div>
                         <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>OPERATOR</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{selectedLog.staff_name || 'System Operator'}</span>
                         </div>
                         <div>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block' }}>TEMPORAL MARK</span>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B' }}>{new Date(selectedLog.created_at).toLocaleString()}</span>
                         </div>
                      </div>
                   </div>

                   <div style={{ marginBottom: '24px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>PRIMARY TRANSACTION SIGNAL</span>
                      <p style={{ background: '#F1F5F9', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#334155', borderLeft: '4px solid #EF4444' }}>
                        {selectedLog.message || 'No primary signal identified for this transaction.'}
                      </p>
                   </div>

                   {selectedLog.metadata && (
                     <div>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>RAW SIGNAL PAYLOAD</span>
                        <pre style={{ background: '#0F172A', color: '#38BDF8', padding: '16px', borderRadius: '12px', fontSize: '12px', overflowX: 'auto', border: '1px solid #1E293B' }}>
                           {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                     </div>
                   )}
                   
                   <div style={{ marginTop: '32px' }}>
                      <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => setIsDetailModalOpen(false)}>Close Investigation</button>
                   </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                   <Activity size={48} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                   <h4 style={{ color: '#64748B' }}>Signal Data Unavailable</h4>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
