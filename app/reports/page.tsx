"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
  FileText,
  TrendingUp,
  Download,
  Clock,
  ArrowLeft,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  FileJson,
  X,
  MapPin,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";
import "../dashboard/Dashboard.css";
import "./Reports.css";

function reportsListPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/reports";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/reports"
    : "/api/v1/super-admin/reports";
}

function clinicalAuditReportPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/reports/clinical-audit";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/reports/clinical-audit"
    : "/api/v1/super-admin/reports/clinical-audit";
}

/** First day of current month through today (YYYY-MM-DD). */
function defaultReportMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(d)}`,
  };
}

function financialReconciliationReportPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/reports/financial-reconciliation";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/reports/financial-reconciliation"
    : "/api/v1/super-admin/reports/financial-reconciliation";
}

/** POST geographic data pack — SA-RPT-04; Super Admin path (staff may 404 if not implemented). */
function geographicDataPackReportPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/reports/geographic-data-pack";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/reports/geographic-data-pack"
    : "/api/v1/super-admin/reports/geographic-data-pack";
}

function defaultClinicalReportName(): string {
  const now = new Date();
  return `${now.toLocaleString("en-US", { month: "long", year: "numeric" })} Clinical Audit`;
}

function defaultFinancialReportName(): string {
  const now = new Date();
  return `${now.toLocaleString("en-US", { month: "long", year: "numeric" })} Financial Summary`;
}

function defaultGeographicReportName(): string {
  return "Regional Density Map";
}

type ReportListItem = {
  report_id: string;
  report_name: string;
  report_type: string;
  type_label: string;
  status: string;
  file_size_label: string;
  created_at: string;
};

function normalizeReportItem(raw: unknown): ReportListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.report_id ?? "").trim();
  if (!id) return null;
  return {
    report_id: id,
    report_name: String(o.report_name ?? "—"),
    report_type: String(o.report_type ?? ""),
    type_label: String(o.type_label ?? o.report_type ?? "—"),
    status: String(o.status ?? "ready").toLowerCase(),
    file_size_label: String(o.file_size_label ?? "—"),
    created_at: String(o.created_at ?? ""),
  };
}

function formatReportDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso.slice(0, 10)
    : d.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

function statusDisplayLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "ready") return "Ready";
  if (s === "generating") return "Generating";
  if (s === "failed") return "Failed";
  if (s === "expired") return "Expired";
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "—";
}

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportMenuId, setShowExportMenuId] = useState<string | null>(null);
  const [archives, setArchives] = useState<ReportListItem[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("");
  const [reportStatusFilter, setReportStatusFilter] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showClinicalAuditModal, setShowClinicalAuditModal] = useState(false);
  const [clinicalAuditName, setClinicalAuditName] = useState("");
  const [clinicalAuditFrom, setClinicalAuditFrom] = useState("");
  const [clinicalAuditTo, setClinicalAuditTo] = useState("");
  const [clinicalAuditError, setClinicalAuditError] = useState("");
  const [clinicalAuditSubmitting, setClinicalAuditSubmitting] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  const [financialReportName, setFinancialReportName] = useState("");
  const [financialFrom, setFinancialFrom] = useState("");
  const [financialTo, setFinancialTo] = useState("");
  const [financialError, setFinancialError] = useState("");
  const [financialSubmitting, setFinancialSubmitting] = useState(false);
  const [showGeographicModal, setShowGeographicModal] = useState(false);
  const [geographicReportName, setGeographicReportName] = useState("");
  const [geographicError, setGeographicError] = useState("");
  const [geographicSubmitting, setGeographicSubmitting] = useState(false);

  const selectStyle: React.CSSProperties = {
    width: "100%",
    fontSize: "13px",
    padding: "8px 10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
  };

  const fetchReports = useCallback(
    async (pageNum: number) => {
      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          per_page: String(perPage),
        });
        if (reportTypeFilter)
          params.set("report_type", reportTypeFilter);
        if (reportStatusFilter)
          params.set("report_status", reportStatusFilter);

        const result = (await api.get(
          `${reportsListPath()}?${params}`,
        )) as {
          success?: boolean;
          data?: Record<string, unknown>;
        };

        if (!result?.success || !result.data || typeof result.data !== "object") {
          setArchives([]);
          setTotal(0);
          setPages(1);
          setPage(1);
          return;
        }

        const d = result.data;
        const items = Array.isArray(d.items) ? d.items : [];
        const rows = items
          .map((item) => normalizeReportItem(item))
          .filter((x): x is ReportListItem => x != null);

        setArchives(rows);
        setTotal(typeof d.total === "number" ? d.total : Number(d.total) || rows.length);
        setPages(
          Math.max(1, typeof d.pages === "number" ? d.pages : Number(d.pages) || 1),
        );
        setPage(
          typeof d.page === "number" ? d.page : Number(d.page) || pageNum,
        );
      } catch (e: unknown) {
        console.error("Reports list fetch failed", e);
        setListError(
          e instanceof Error ? e.message : "Could not load reports.",
        );
        setArchives([]);
        setTotal(0);
        setPages(1);
      } finally {
        setListLoading(false);
      }
    },
    [perPage, reportTypeFilter, reportStatusFilter],
  );

  useEffect(() => {
    void fetchReports(1);
  }, [fetchReports]);

  useEffect(() => {
    if (!showClinicalAuditModal && !showFinancialModal && !showGeographicModal)
      return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (
        clinicalAuditSubmitting ||
        financialSubmitting ||
        geographicSubmitting
      )
        return;
      if (showClinicalAuditModal) setShowClinicalAuditModal(false);
      if (showFinancialModal) setShowFinancialModal(false);
      if (showGeographicModal) setShowGeographicModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    showClinicalAuditModal,
    showFinancialModal,
    showGeographicModal,
    clinicalAuditSubmitting,
    financialSubmitting,
    geographicSubmitting,
  ]);

  const handleBack = () => {
    router.back();
  };

  const openClinicalAuditModal = () => {
    const { from, to } = defaultReportMonthDateRange();
    setClinicalAuditFrom(from);
    setClinicalAuditTo(to);
    setClinicalAuditName(defaultClinicalReportName());
    setClinicalAuditError("");
    setShowClinicalAuditModal(true);
  };

  const openFinancialModal = () => {
    const { from, to } = defaultReportMonthDateRange();
    setFinancialFrom(from);
    setFinancialTo(to);
    setFinancialReportName(defaultFinancialReportName());
    setFinancialError("");
    setShowFinancialModal(true);
  };

  const openGeographicModal = () => {
    setGeographicReportName(defaultGeographicReportName());
    setGeographicError("");
    setShowGeographicModal(true);
  };

  const submitFinancialReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFinancialError("");
    if (!financialFrom || !financialTo) {
      setFinancialError("Please select both dates.");
      return;
    }
    if (financialFrom > financialTo) {
      setFinancialError("From date must be on or before To date.");
      return;
    }
    setFinancialSubmitting(true);
    setLoading("financial");
    try {
      const body: {
        report_name?: string;
        from_date: string;
        to_date: string;
      } = {
        from_date: financialFrom,
        to_date: financialTo,
      };
      const name = financialReportName.trim();
      if (name) body.report_name = name;

      const result = (await api.post(
        financialReconciliationReportPath(),
        body,
      )) as {
        success?: boolean;
        message?: string;
      };

      if (!result?.success) {
        throw new Error(result?.message || "Report generation failed.");
      }

      setShowFinancialModal(false);
      await fetchReports(1);
    } catch (err: unknown) {
      console.error("Financial reconciliation generation failed", err);
      setFinancialError(
        err instanceof Error ? err.message : "Request failed.",
      );
    } finally {
      setFinancialSubmitting(false);
      setLoading(null);
    }
  };

  const submitClinicalAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClinicalAuditError("");
    if (!clinicalAuditFrom || !clinicalAuditTo) {
      setClinicalAuditError("Please select both dates.");
      return;
    }
    if (clinicalAuditFrom > clinicalAuditTo) {
      setClinicalAuditError("From date must be on or before To date.");
      return;
    }
    setClinicalAuditSubmitting(true);
    setLoading("clinical");
    try {
      const body: {
        report_name?: string;
        from_date: string;
        to_date: string;
      } = {
        from_date: clinicalAuditFrom,
        to_date: clinicalAuditTo,
      };
      const name = clinicalAuditName.trim();
      if (name) body.report_name = name;

      const result = (await api.post(
        clinicalAuditReportPath(),
        body,
      )) as {
        success?: boolean;
        message?: string;
      };

      if (!result?.success) {
        throw new Error(result?.message || "Report generation failed.");
      }

      setShowClinicalAuditModal(false);
      await fetchReports(1);
    } catch (err: unknown) {
      console.error("Clinical audit generation failed", err);
      setClinicalAuditError(
        err instanceof Error ? err.message : "Request failed.",
      );
    } finally {
      setClinicalAuditSubmitting(false);
      setLoading(null);
    }
  };

  const submitGeographicDataPack = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeographicError("");
    const name = geographicReportName.trim();
    if (!name) {
      setGeographicError("Report name is required.");
      return;
    }
    setGeographicSubmitting(true);
    setLoading("geographic");
    try {
      const result = (await api.post(geographicDataPackReportPath(), {
        report_name: name,
      })) as {
        success?: boolean;
        message?: string;
      };

      if (!result?.success) {
        throw new Error(result?.message || "Report generation failed.");
      }

      setShowGeographicModal(false);
      await fetchReports(1);
    } catch (err: unknown) {
      console.error("Geographic data pack generation failed", err);
      setGeographicError(
        err instanceof Error ? err.message : "Request failed.",
      );
    } finally {
      setGeographicSubmitting(false);
      setLoading(null);
    }
  };

  const handleGenerate = async (moduleId: string, title: string) => {
    setLoading(moduleId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fetchReports(1);
    } catch (err) {
      console.error("Generation failed", err);
    } finally {
      setLoading(null);
    }
  };

  const handleModuleAction = (moduleId: string, title: string) => {
    if (moduleId === "clinical") {
      openClinicalAuditModal();
      return;
    }
    if (moduleId === "financial") {
      openFinancialModal();
      return;
    }
    if (moduleId === "geographic") {
      openGeographicModal();
      return;
    }
    void handleGenerate(moduleId, title);
  };

  const handleDownload = (report: ReportListItem, format: string) => {
    const headers = ["ID", "Report Name", "Type", "Date", "Status", "Size"];
    const row = [
      report.report_id,
      report.report_name,
      report.type_label,
      formatReportDate(report.created_at),
      statusDisplayLabel(report.status),
      report.file_size_label,
    ];

    let content = "";
    let mimeType = "text/plain";
    let extension = "txt";

    if (format === "csv") {
      content = [headers.join(","), row.join(",")].join("\n");
      mimeType = "text/csv";
      extension = "csv";
    } else if (format === "excel") {
      content = [headers.join(","), row.join(",")].join("\n");
      mimeType = "application/vnd.ms-excel";
      extension = "csv";
    } else {
      content = `
=========================================
      AYKA PLATFORM INTELLIGENCE
=========================================
REPORT ID   : ${report.report_id}
TITLE       : ${report.report_name}
CATEGORY    : ${report.type_label}
TIMESTAMP   : ${report.created_at}
STATUS      : ${statusDisplayLabel(report.status)}
-----------------------------------------
EXECUTIVE SUMMARY:
This document contains system-generated 
insights for the Ayka Super-Admin panel.
=========================================
      `;
      mimeType = "application/pdf";
      extension = "pdf";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.report_name.replace(/\s+/g, "_")}_${report.report_id}.${extension}`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);

    setShowExportMenuId(null);
  };

  const filteredArchives = archives.filter(
    (report) =>
      report.report_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type_label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const reportModules = [
    {
      id: "clinical",
      title: "Clinical Audit Log",
      desc: "Detailed forensic breakdown of clinic registrations, instance updates, and jurisdictional modifications.",
      icon: <FileText size={28} />,
      color: "#3b82f6",
      bg: "rgba(59, 130, 246, 0.1)",
      action: "Generate Audit",
    },
    {
      id: "financial",
      title: "Financial Reconciliation",
      desc: "A comprehensive summary of platform revenue, subscription performance, and pending transactions.",
      icon: <TrendingUp size={28} />,
      color: "#10b981",
      bg: "rgba(16, 185, 129, 0.1)",
      action: "Download Summary",
    },
    {
      id: "geographic",
      title: "Geographic Data Pack",
      desc: "Export specialized location intelligence datasets including heatmaps of active patient and doctor density.",
      icon: <Download size={28} />,
      color: "#8b5cf6",
      bg: "rgba(139, 92, 246, 0.1)",
      action: "Export Dataset",
    },
  ];

  const goPage = (p: number) => {
    if (p < 1 || p > pages || listLoading) return;
    setPage(p);
    void fetchReports(p);
  };

  return (
    <div
      className="page-container reports-view"
      onClick={() => {
        setShowExportMenuId(null);
        setFiltersOpen(false);
        if (
          !clinicalAuditSubmitting &&
          !financialSubmitting &&
          !geographicSubmitting
        ) {
          setShowClinicalAuditModal(false);
          setShowFinancialModal(false);
          setShowGeographicModal(false);
        }
      }}
    >
      <header className="reports-page-header">
        <div className="header-left">
          <button type="button" className="back-btn" onClick={handleBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="reports-header-title-block">
            <h1 className="page-title">Platform Intelligence Reports</h1>
            <p className="page-subtitle">
              Unified executive workspace for operational transparency and data
              exports.
            </p>
          </div>
        </div>
      </header>

      <div className="reports-grid">
        {reportModules.map((module) => (
          <div
            key={module.id}
            className={`card report-module-card animate-in ${loading === module.id ? "processing" : ""}`}
          >
            <div
              className="module-icon"
              style={{ backgroundColor: module.bg, color: module.color }}
            >
              {loading === module.id ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                module.icon
              )}
            </div>
            <div className="module-content">
              <h3>{module.title}</h3>
              <p>{module.desc}</p>
            </div>
            <button
              type="button"
              className="module-action-btn"
              disabled={!!loading}
              onClick={(e) => {
                e.stopPropagation();
                handleModuleAction(module.id, module.title);
              }}
            >
              <span>
                {loading === module.id ? "Processing..." : module.action}
              </span>
              {loading === module.id ? null : <ChevronRight size={18} />}
            </button>
          </div>
        ))}
      </div>

      <div className="archive-section mt-32">
        <div className="reports-archive-head">
          <div className="section-title-box reports-archive-title">
            <Clock size={22} />
            <h2>
              Recent Generated Archives
              {listLoading ? "" : ` (${total})`}
            </h2>
          </div>
          <div className="reports-archive-toolbar">
            <div className="search-box reports-archive-search">
              <Search size={18} aria-hidden />
              <input
                type="search"
                placeholder="Search name, type, or ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Search archives"
              />
            </div>
            <div className="reports-filter-wrap">
              <button
                type="button"
                className={`btn btn-secondary reports-filter-btn ${filtersOpen ? "is-open" : ""} ${reportTypeFilter || reportStatusFilter ? "has-filters" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setFiltersOpen((o) => !o);
                }}
              >
                <Filter size={18} aria-hidden />
                Filters
                {(reportTypeFilter || reportStatusFilter) && (
                  <span className="reports-filter-dot" aria-hidden />
                )}
              </button>
              {filtersOpen && (
                <div
                  className="export-menu reports-filter-panel animate-in"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-label="Report filters"
                >
                  <p className="reports-filter-panel-hint">
                    Narrow the list from the server.
                  </p>
                  <div className="reports-filter-field">
                    <label htmlFor="reports-filter-type">Report type</label>
                    <select
                      id="reports-filter-type"
                      style={selectStyle}
                      value={reportTypeFilter}
                      onChange={(e) => {
                        setReportTypeFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All types</option>
                      <option value="clinical">Clinical</option>
                      <option value="financial">Financial</option>
                      <option value="geographic">Geographic</option>
                    </select>
                  </div>
                  <div className="reports-filter-field">
                    <label htmlFor="reports-filter-status">Status</label>
                    <select
                      id="reports-filter-status"
                      style={selectStyle}
                      value={reportStatusFilter}
                      onChange={(e) => {
                        setReportStatusFilter(e.target.value);
                        setPage(1);
                      }}
                    >
                      <option value="">All statuses</option>
                      <option value="generating">Generating</option>
                      <option value="ready">Ready</option>
                      <option value="failed">Failed</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary reports-filter-clear"
                    onClick={() => {
                      setReportTypeFilter("");
                      setReportStatusFilter("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {listError ? (
          <p
            style={{
              color: "#b91c1c",
              fontSize: "14px",
              marginBottom: "16px",
            }}
            role="alert"
          >
            {listError}
          </p>
        ) : null}

        <div className="card table-card glass-card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Report Name</th>
                  <th>Type</th>
                  <th>Dated</th>
                  <th>File Size</th>
                  <th>Status</th>
                  <th>Actions Export</th>
                </tr>
              </thead>
              <tbody>
                {listLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <Loader2
                        className="animate-spin"
                        size={24}
                        style={{ display: "inline-block", verticalAlign: "middle" }}
                      />{" "}
                      Loading reports…
                    </td>
                  </tr>
                ) : filteredArchives.length > 0 ? (
                  filteredArchives.map((report) => (
                    <tr key={report.report_id} className="animate-in">
                      <td>
                        <div className="report-name-col">
                          <div className="report-icon-mini">
                            <FileText size={20} />
                          </div>
                          <div className="report-text">
                            <h4>{report.report_name}</h4>
                            <span>{report.report_id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="type-tag">{report.type_label}</span>
                      </td>
                      <td>
                        <div className="date-col">
                          <Calendar size={14} />
                          {formatReportDate(report.created_at)}
                        </div>
                      </td>
                      <td>
                        <span className="file-size">
                          {report.file_size_label}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${report.status.toLowerCase()}`}
                        >
                          <span className="status-dot" />
                          {statusDisplayLabel(report.status)}
                        </span>
                      </td>
                      <td style={{ position: "relative" }}>
                        <div className="report-actions-cell">
                          <button
                            type="button"
                            className={`icon-btn download ${showExportMenuId === report.report_id ? "active" : ""}`}
                            title="Export Options"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowExportMenuId(
                                showExportMenuId === report.report_id
                                  ? null
                                  : report.report_id,
                              );
                            }}
                          >
                            <Download size={18} />
                          </button>
                        </div>

                        {showExportMenuId === report.report_id && (
                          <div
                            className="export-menu animate-in"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleDownload(report, "pdf")}
                            >
                              <FileText size={16} color="#ef4444" />
                              <span>Executive PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(report, "excel")}
                            >
                              <FileSpreadsheet size={16} color="#10b981" />
                              <span>Excel Spreadsheet</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownload(report, "csv")}
                            >
                              <FileJson size={16} color="#3b82f6" />
                              <span>CSV Raw Data</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "var(--text-muted)",
                      }}
                    >
                      No reports found matching your requisition criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!listLoading && total > 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderTop: "1px solid rgba(0,0,0,0.06)",
                fontSize: "13px",
                color: "#64748b",
              }}
            >
              <span>
                Page {page} of {pages}
                {searchTerm.trim() && filteredArchives.length < archives.length
                  ? ` · ${filteredArchives.length} shown (search on this page)`
                  : null}
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page <= 1 || listLoading}
                  onClick={() => goPage(page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page >= pages || listLoading}
                  onClick={() => goPage(page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showClinicalAuditModal && (
        <div
          className="reports-modal-overlay"
          role="presentation"
          onClick={() =>
            !clinicalAuditSubmitting &&
            setShowClinicalAuditModal(false)
          }
        >
          <div
            className="reports-modal-panel animate-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clinical-audit-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reports-modal-header">
              <div className="reports-modal-header-text">
                <div className="reports-modal-icon" aria-hidden>
                  <FileText size={22} />
                </div>
                <div>
                  <h2 id="clinical-audit-modal-title">Clinical audit report</h2>
                  <p>
                    Optional name and date range. Defaults match the current
                    month if you leave dates as suggested.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="reports-modal-close"
                disabled={clinicalAuditSubmitting}
                onClick={() => setShowClinicalAuditModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form className="reports-modal-body" onSubmit={submitClinicalAudit}>
              <div className="reports-modal-field">
                <label htmlFor="clinical-audit-name">Report name</label>
                <input
                  id="clinical-audit-name"
                  type="text"
                  className="reports-modal-input"
                  value={clinicalAuditName}
                  onChange={(e) => setClinicalAuditName(e.target.value)}
                  placeholder="e.g. April Clinical Audit"
                  disabled={clinicalAuditSubmitting}
                />
              </div>
              <div className="reports-modal-dates">
                <div className="reports-modal-field">
                  <label htmlFor="clinical-audit-from">From date</label>
                  <input
                    id="clinical-audit-from"
                    type="date"
                    className="reports-modal-input"
                    value={clinicalAuditFrom}
                    onChange={(e) => setClinicalAuditFrom(e.target.value)}
                    required
                    disabled={clinicalAuditSubmitting}
                  />
                </div>
                <div className="reports-modal-field">
                  <label htmlFor="clinical-audit-to">To date</label>
                  <input
                    id="clinical-audit-to"
                    type="date"
                    className="reports-modal-input"
                    value={clinicalAuditTo}
                    onChange={(e) => setClinicalAuditTo(e.target.value)}
                    required
                    disabled={clinicalAuditSubmitting}
                  />
                </div>
              </div>

              {clinicalAuditError ? (
                <p className="reports-modal-error" role="alert">
                  {clinicalAuditError}
                </p>
              ) : null}

              <div className="reports-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={clinicalAuditSubmitting}
                  onClick={() => setShowClinicalAuditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={clinicalAuditSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {clinicalAuditSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : null}
                  Generate audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFinancialModal && (
        <div
          className="reports-modal-overlay"
          role="presentation"
          onClick={() =>
            !financialSubmitting && setShowFinancialModal(false)
          }
        >
          <div
            className="reports-modal-panel animate-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="financial-reconciliation-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reports-modal-header">
              <div className="reports-modal-header-text">
                <div
                  className="reports-modal-icon reports-modal-icon--financial"
                  aria-hidden
                >
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h2 id="financial-reconciliation-modal-title">
                    Financial reconciliation
                  </h2>
                  <p>
                    Revenue, subscriptions, and pending transactions for the
                    range you choose. Defaults use the current month.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="reports-modal-close"
                disabled={financialSubmitting}
                onClick={() => setShowFinancialModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="reports-modal-body"
              onSubmit={submitFinancialReconciliation}
            >
              <div className="reports-modal-field">
                <label htmlFor="financial-report-name">Report name</label>
                <input
                  id="financial-report-name"
                  type="text"
                  className="reports-modal-input"
                  value={financialReportName}
                  onChange={(e) => setFinancialReportName(e.target.value)}
                  placeholder="e.g. Q1 Financial Summary"
                  disabled={financialSubmitting}
                />
              </div>
              <div className="reports-modal-dates">
                <div className="reports-modal-field">
                  <label htmlFor="financial-from">From date</label>
                  <input
                    id="financial-from"
                    type="date"
                    className="reports-modal-input"
                    value={financialFrom}
                    onChange={(e) => setFinancialFrom(e.target.value)}
                    required
                    disabled={financialSubmitting}
                  />
                </div>
                <div className="reports-modal-field">
                  <label htmlFor="financial-to">To date</label>
                  <input
                    id="financial-to"
                    type="date"
                    className="reports-modal-input"
                    value={financialTo}
                    onChange={(e) => setFinancialTo(e.target.value)}
                    required
                    disabled={financialSubmitting}
                  />
                </div>
              </div>

              {financialError ? (
                <p className="reports-modal-error" role="alert">
                  {financialError}
                </p>
              ) : null}

              <div className="reports-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={financialSubmitting}
                  onClick={() => setShowFinancialModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={financialSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {financialSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : null}
                  Generate report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGeographicModal && (
        <div
          className="reports-modal-overlay"
          role="presentation"
          onClick={() =>
            !geographicSubmitting && setShowGeographicModal(false)
          }
        >
          <div
            className="reports-modal-panel animate-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="geographic-data-pack-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="reports-modal-header">
              <div className="reports-modal-header-text">
                <div
                  className="reports-modal-icon reports-modal-icon--geographic"
                  aria-hidden
                >
                  <MapPin size={22} />
                </div>
                <div>
                  <h2 id="geographic-data-pack-modal-title">
                    Geographic data pack
                  </h2>
                  <p>
                    Exports location intelligence (patient and doctor density
                    by state and city). Name your report, then generate.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="reports-modal-close"
                disabled={geographicSubmitting}
                onClick={() => setShowGeographicModal(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="reports-modal-body"
              onSubmit={submitGeographicDataPack}
            >
              <div className="reports-modal-field">
                <label htmlFor="geographic-report-name">Report name</label>
                <input
                  id="geographic-report-name"
                  type="text"
                  className="reports-modal-input"
                  value={geographicReportName}
                  onChange={(e) => setGeographicReportName(e.target.value)}
                  placeholder="e.g. Regional Density Map"
                  required
                  disabled={geographicSubmitting}
                />
              </div>

              {geographicError ? (
                <p className="reports-modal-error" role="alert">
                  {geographicError}
                </p>
              ) : null}

              <div className="reports-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={geographicSubmitting}
                  onClick={() => setShowGeographicModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={geographicSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {geographicSubmitting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : null}
                  Generate pack
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
