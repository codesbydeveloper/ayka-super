"use client";
import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Trash2, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  Smartphone,
  Eye,
  Info,
  MessageSquare,
  Zap,
  Layout,
  Star,
  Settings,
  ChevronRight
} from 'lucide-react';
import './Notifications.css';

export default function NotificationsPage() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['app', 'email']);
  const [selectedTemplate, setSelectedTemplate] = useState('none');

  const history = [
    { id: 1, type: 'Maintenance', target: 'Tier: All', subject: 'Cloud Infrastructure Upgrade', sent: 'Oct 14, 10:00 AM', status: 'Delivered', reach: '2.4k' },
    { id: 2, type: 'Marketing', target: 'Tier: Growth', subject: 'New Feature: AI Prescriptions', sent: 'Oct 12, 02:30 PM', status: 'Delivered', reach: '512' },
    { id: 3, type: 'Critical', target: 'Expired', subject: 'Subscription Reactivation Needed', sent: 'Oct 10, 09:15 AM', status: 'Processing', reach: '1.2k' },
  ];

  const templates = [
    { id: 'maint', name: 'Service Maintenance', desc: 'Notify about scheduled downtime.' },
    { id: 'renew', name: 'Subscription Renewal', desc: 'Alert regarding upcoming expiry.' },
    { id: 'feat', name: 'Feature Announcement', desc: 'Showcase new platform capabilities.' },
    { id: 'urgent', name: 'Emergency Alert', desc: 'Immediate system-wide notification.' }
  ];

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  return (
    <div className="page-container broadcast-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Platform Broadcast Center</h1>
          <p className="page-subtitle">Multi-channel communication hub for Ayka Central administrators.</p>
        </div>
        <div className="header-actions">
           <button className="btn btn-secondary"><Settings size={18} /> API Config</button>
        </div>
      </div>

      <div className="notification-grid">
         <div className="compose-section">
            <div className="card broadcast-compose-card animate-in">
               <div className="card-header-simple">
                  <h3 className="card-heading">Draft New Transmission</h3>
                  <div className="status-dot"></div>
               </div>

               <div className="broadcast-form">
                  <div className="form-group">
                     <label>Select Template Strategy</label>
                     <div className="template-grid">
                        {templates.map(t => (
                           <div key={t.id} className={`template-box ${selectedTemplate === t.id ? 'active' : ''}`} onClick={() => setSelectedTemplate(t.id)}>
                              <span className="template-name">{t.name}</span>
                              <span className="template-desc">{t.desc}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="form-row">
                     <div className="form-group flex-1">
                        <label>Target Audience</label>
                        <select className="form-input">
                           <option>All Active Clinics</option>
                           <option>Experts: Premium Tier</option>
                           <option>State Franchise Owners</option>
                           <option>Past Due Subscriptions</option>
                        </select>
                     </div>
                     <div className="form-group flex-1">
                        <label>Priority Level</label>
                        <select className="form-input">
                           <option>Normal (Standard Batch)</option>
                           <option>Medium (Urgent Queue)</option>
                           <option>High (Real-time Instant)</option>
                        </select>
                     </div>
                  </div>

                  <div className="form-group">
                     <label>Activation Channels</label>
                     <div className="channel-grid">
                        <div className={`channel-card ${selectedChannels.includes('app') ? 'active' : ''}`} onClick={() => toggleChannel('app')}>
                           <Bell size={24} /><div className="chan-info"><span className="chan-title">APP PUSH</span><span className="chan-status">Enabled</span></div>
                        </div>
                        <div className={`channel-card ${selectedChannels.includes('email') ? 'active' : ''}`} onClick={() => toggleChannel('email')}>
                           <Mail size={24} /><div className="chan-info"><span className="chan-title">EMAIL BLAST</span><span className="chan-status">Enabled</span></div>
                        </div>
                        <div className={`channel-card ${selectedChannels.includes('wa') ? 'active' : ''}`} onClick={() => toggleChannel('wa')}>
                           <MessageSquare size={24} /><div className="chan-info"><span className="chan-title">WHATSAPP</span><span className="chan-status">API Ready</span></div>
                        </div>
                     </div>
                  </div>

                  <div className="form-group">
                     <label>Transmission Payload</label>
                     <input className="form-input" placeholder="Transmission Subject Headline..." style={{ marginBottom: '12px' }} />
                     <textarea className="form-input" style={{ minHeight: '120px' }} placeholder="Message Body Metadata (supports HTML/MD)..." />
                  </div>

                  <div className="broadcast-actions">
                     <button className="btn btn-primary btn-xl">
                        <Zap size={20} fill="currentColor" />
                        <span>INITIATE BROADCAST SEQUENCE</span>
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div className="history-section">
            <div className="card transmission-history-card">
               <div className="card-header-simple">
                  <h3 className="card-heading">Transmission Audit Logs</h3>
                  <button className="btn-text-muted"><History size={16} /> Full Archive</button>
               </div>

               <div className="audit-list">
                  {history.map(h => (
                     <div key={h.id} className="audit-item">
                        <div className="audit-icon"><Layout size={20} /></div>
                        <div className="audit-main">
                           <div className="audit-top">
                              <span className="audit-subject">{h.subject}</span>
                              <span className={`status-tag ${h.status.toLowerCase()}`}>{h.status}</span>
                           </div>
                           <div className="audit-meta">
                              <span>Reach: {h.reach} Deliveries</span> • <span>Timestamp: {h.sent}</span>
                           </div>
                        </div>
                        <button className="audit-action"><ChevronRight size={18} /></button>
                     </div>
                  ))}
               </div>
            </div>

            <div className="platform-health-card">
               <div className="health-header">
                  <CheckCircle2 size={24} color="#10b981" />
                  <div>
                     <span className="health-title">Notification Gateway Healthy</span>
                     <span className="health-desc">All API nodes operating at 12ms latency.</span>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
