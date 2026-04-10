"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  CreditCard, 
  Download, 
  Calendar,
  Filter,
  XCircle,
  Clock,
  Search,
  Loader2,
  FileText,
  Plus,
  X
} from 'lucide-react';
import StatCard from '@/app/components/ui/StatCard';
import { api } from '@/utils/api';
import { buildAndDownloadRevenueReportPdf } from '@/utils/revenueReportPdf';
import '../dashboard/Dashboard.css';

type BillingDoctorOption = {
  id: number;
  name: string;
  clinic_name?: string;
  specialisation?: string;
};

function doctorsFromTransactionsApi(result: Record<string, unknown>): BillingDoctorOption[] {
  const data = result.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return [];
  const raw = (data as { doctors?: unknown }).doctors;
  if (!Array.isArray(raw)) return [];
  const out: BillingDoctorOption[] = [];
  for (const d of raw) {
    if (!d || typeof d !== "object") continue;
    const o = d as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) continue;
    const name = String(o.name ?? o.full_name ?? "—");
    out.push({
      id,
      name,
      clinic_name: o.clinic_name != null ? String(o.clinic_name) : undefined,
      specialisation: o.specialisation != null ? String(o.specialisation) : undefined,
    });
  }
  return out;
}

type BillingPatientOption = {
  id: number;
  name: string;
  phone_number?: string;
  clinic_name?: string;
  patient_code?: string;
};

function patientsFromApi(result: Record<string, unknown>): BillingPatientOption[] {
  const data = result.data as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return [];
  const raw = (data as { patients?: unknown }).patients;
  if (!Array.isArray(raw)) return [];
  const out: BillingPatientOption[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) continue;
    const name = String(o.name ?? "—");
    out.push({
      id,
      name,
      phone_number: o.phone_number != null ? String(o.phone_number) : undefined,
      clinic_name: o.clinic_name != null ? String(o.clinic_name) : undefined,
      patient_code: o.patient_id != null ? String(o.patient_id) : undefined,
    });
  }
  return out;
}

function billingSummaryPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/billing/summary";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/billing/summary"
    : "/api/v1/super-admin/billing/summary";
}

function billingTransactionsPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/billing/transactions";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/billing/transactions"
    : "/api/v1/super-admin/billing/transactions";
}

function billingReportPath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/billing/report";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/billing/report"
    : "/api/v1/super-admin/billing/report";
}

function billingTransactionOverridePath(): string {
  if (typeof window === "undefined")
    return "/api/v1/super-admin/billing/transactions/override";
  return localStorage.getItem("user_type") === "admin_staff"
    ? "/api/v1/admin-staff/billing/transactions/override"
    : "/api/v1/super-admin/billing/transactions/override";
}

function defaultReportDateRange(): { from: string; to: string } {
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

type BillingTxRow = {
  rowKey: string;
  order_id: string;
  medical_center: string;
  amount: number;
  plan_tier: string;
  plan_category?: string;
  date: string;
  status: string;
  receipt?: string;
  is_override?: boolean;
};

function normalizeBillingTransactionItem(
  raw: unknown,
  index: number,
): BillingTxRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const orderIdRaw = String(o.order_id ?? "").trim();
  const subId = o.subscription_id;
  const orderId =
    orderIdRaw ||
    (subId != null && String(subId) !== ""
      ? `SUB-${String(subId)}`
      : `—`);
  const rowKey =
    (orderIdRaw || subId != null ? String(subId) : "") +
    `-${String(o.date ?? index)}-${index}`;
  return {
    rowKey,
    order_id: orderId,
    medical_center: String(o.medical_center ?? o.clinic_name ?? "—"),
    amount: typeof o.amount === "number" ? o.amount : Number(o.amount) || 0,
    plan_tier: String(o.plan_tier ?? o.plan ?? "—"),
    plan_category:
      o.plan_category != null ? String(o.plan_category) : undefined,
    date: String(o.date ?? o.created_at ?? ""),
    status: String(o.status ?? "pending").toLowerCase(),
    receipt: o.receipt != null ? String(o.receipt) : undefined,
    is_override: Boolean(o.is_override),
  };
}

const billingRupeeFmt = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatBillingSummaryRupee(n: number): string {
  return `₹${billingRupeeFmt.format(n)}`;
}

function numFromSummaryField(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value?: unknown }).value;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const parsed = Number(v);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function applyBillingSummaryToStats(
  data: Record<string, unknown>,
): {
  totalRevenue: string;
  mrr: string;
  arr: string;
  overdue: string;
  refunds: string;
} {
  return {
    totalRevenue: formatBillingSummaryRupee(
      numFromSummaryField(data.total_revenue),
    ),
    mrr: formatBillingSummaryRupee(numFromSummaryField(data.mrr)),
    arr: formatBillingSummaryRupee(numFromSummaryField(data.estimated_arr)),
    overdue: formatBillingSummaryRupee(
      numFromSummaryField(data.late_payments),
    ),
    refunds: formatBillingSummaryRupee(numFromSummaryField(data.refunded)),
  };
}

export default function BillingPage() {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");

  const handleGenerateReport = () => {
    const { from, to } = defaultReportDateRange();
    setReportFromDate(from);
    setReportToDate(to);
    setReportError("");
    setShowReportModal(true);
  };

  const handleDownloadRevenueReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError("");
    if (!reportFromDate || !reportToDate) {
      setReportError("Please select both dates.");
      return;
    }
    if (reportFromDate > reportToDate) {
      setReportError("From date must be on or before To date.");
      return;
    }
    setReportLoading(true);
    try {
      const q = new URLSearchParams({
        from_date: reportFromDate,
        to_date: reportToDate,
      });
      const res = (await api.get(
        `${billingReportPath()}?${q}`,
      )) as {
        success?: boolean;
        data?: Record<string, unknown>;
      };
      if (!res?.success || !res.data || typeof res.data !== "object") {
        throw new Error("Invalid response from server.");
      }
      buildAndDownloadRevenueReportPdf(res.data);
      setShowReportModal(false);
    } catch (err: unknown) {
      setReportError(
        err instanceof Error ? err.message : "Failed to generate report.",
      );
    } finally {
      setReportLoading(false);
    }
  };

  const [payments, setPayments] = useState<BillingTxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subStatus, setSubStatus] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const txPerPage = 20;
  const [stats, setStats] = useState({
    totalRevenue: "₹422,500",
    mrr: "₹45,200",
    arr: "₹542,400",
    overdue: "₹2,450",
    refunds: "₹1,200"
  });
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [planType, setPlanType] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // New Transaction Form State
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isModalOpen && !showReportModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showReportModal) setShowReportModal(false);
      else setIsModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen, showReportModal]);
  const [creating, setCreating] = useState(false);
  const [doctorsForTxn, setDoctorsForTxn] = useState<BillingDoctorOption[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [patientsForTxn, setPatientsForTxn] = useState<BillingPatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const initialTxnOverride = () => ({
    clinic_id: 0,
    amount: 0,
    category: "Consultation",
    payment_method: "cash_override",
    tax: 0,
    doctor_id: 0,
    patient_id: 0,
    description: "",
  });

  const [txnData, setTxnData] = useState(initialTxnOverride);

  const fetchBillingSummary = useCallback(async () => {
    try {
      const res = (await api.get(billingSummaryPath())) as {
        success?: boolean;
        data?: Record<string, unknown>;
      };
      if (res?.success && res.data && typeof res.data === "object") {
        setStats((prev) => ({ ...prev, ...applyBillingSummaryToStats(res.data!) }));
      }
    } catch {
      /* keep existing stats */
    }
  }, []);

  const loadBillingTransactions = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: String(page),
          per_page: String(txPerPage),
        });
        if (searchTerm.trim()) queryParams.set("search", searchTerm.trim());
        if (planType) queryParams.set("plan_type", planType);
        if (paymentMethod) queryParams.set("payment_method", paymentMethod);
        if (selectedClinic) queryParams.set("clinic_id", selectedClinic);
        if (subStatus) queryParams.set("sub_status", subStatus);

        const result = (await api.get(
          `${billingTransactionsPath()}?${queryParams}`,
        )) as {
          success?: boolean;
          data?: Record<string, unknown>;
          is_access_error?: boolean;
        };

        if (result?.success && result.data && typeof result.data === "object") {
          const d = result.data;
          const items = Array.isArray(d.items) ? d.items : [];
          const rows = items
            .map((item, i) => normalizeBillingTransactionItem(item, i))
            .filter((x): x is BillingTxRow => x != null);
          setPayments(rows);
          setTxPage(
            typeof d.page === "number" ? d.page : Number(d.page) || page,
          );
          setTxPages(
            Math.max(1, typeof d.pages === "number" ? d.pages : Number(d.pages) || 1),
          );
          setTxTotal(
            typeof d.total === "number" ? d.total : Number(d.total) || rows.length,
          );
        } else {
          if (
            result &&
            typeof result === "object" &&
            "is_access_error" in result &&
            result.is_access_error
          ) {
            console.warn(
              "Billing transactions masked by administrative authorization.",
            );
          }
          setPayments([]);
          setTxPages(1);
          setTxTotal(0);
        }
      } catch (err: unknown) {
        console.error("Fetch billing transactions error:", err);
        setPayments([]);
        setTxPages(1);
        setTxTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [
      searchTerm,
      planType,
      paymentMethod,
      selectedClinic,
      subStatus,
      txPerPage,
    ],
  );

  useEffect(() => {
    void loadBillingTransactions(1);

  }, []);

  const fetchPayments = useCallback(() => {
    void loadBillingTransactions(1);
  }, [loadBillingTransactions]);

  const goTxPage = useCallback(
    (p: number) => {
      void loadBillingTransactions(p);
    },
    [loadBillingTransactions],
  );

  useEffect(() => {
    void fetchBillingSummary();
  }, [fetchBillingSummary]);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const result = await api.get('/api/v1/super-admin/clinics?limit=100');
        if (result && result.success && result.data) {
          const data = result.data.clinics || result.data;
          setClinics(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Failed to fetch clinics for filter');
      }
    };
    fetchClinics();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    (async () => {
      setDoctorsLoading(true);
      setPatientsLoading(true);
      const userType =
        typeof window !== "undefined" ? localStorage.getItem("user_type") : null;
      const isStaff = userType === "admin_staff";
      const doctorBase = isStaff
        ? "/api/v1/admin-staff/doctors"
        : "/api/v1/super-admin/doctors";
      const patientBase = isStaff
        ? "/api/v1/admin-staff/patients"
        : "/api/v1/super-admin/patients";
      const params = new URLSearchParams({ skip: "0", limit: "100" });
      const clinicForModal =
        txnData.clinic_id > 0 ? String(txnData.clinic_id) : selectedClinic;
      if (clinicForModal) params.set("clinic_id", clinicForModal);
      const q = params.toString();

      const [docResult, patResult] = await Promise.allSettled([
        api.get(`${doctorBase}?${q}`),
        api.get(`${patientBase}?${q}`),
      ]);

      if (cancelled) return;

      if (docResult.status === "fulfilled") {
        setDoctorsForTxn(
          doctorsFromTransactionsApi(docResult.value as Record<string, unknown>),
        );
      } else {
        console.error(
          "Failed to fetch doctors for override modal",
          docResult.reason,
        );
        setDoctorsForTxn([]);
      }

      if (patResult.status === "fulfilled") {
        setPatientsForTxn(
          patientsFromApi(patResult.value as Record<string, unknown>),
        );
      } else {
        console.error(
          "Failed to fetch patients for override modal",
          patResult.reason,
        );
        setPatientsForTxn([]);
      }

      setDoctorsLoading(false);
      setPatientsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
   }, [isModalOpen, selectedClinic, txnData.clinic_id]);

  useEffect(() => {
    if (!isModalOpen || doctorsLoading) return;
    if (txnData.doctor_id <= 0) return;
    if (!doctorsForTxn.some((d) => d.id === txnData.doctor_id)) {
      setTxnData((prev) => ({ ...prev, doctor_id: 0 }));
    }
  }, [doctorsForTxn, doctorsLoading, isModalOpen, txnData.doctor_id]);

  useEffect(() => {
    if (!isModalOpen || patientsLoading) return;
    if (txnData.patient_id <= 0) return;
    if (!patientsForTxn.some((p) => p.id === txnData.patient_id)) {
      setTxnData((prev) => ({ ...prev, patient_id: 0 }));
    }
  }, [patientsForTxn, patientsLoading, isModalOpen, txnData.patient_id]);

  const handleCreateTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnData.clinic_id || !Number.isFinite(txnData.clinic_id)) {
      alert("Select a clinic for this record.");
      return;
    }
    if (!(txnData.amount > 0)) {
      alert("Enter a transaction amount greater than zero.");
      return;
    }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        clinic_id: txnData.clinic_id,
        amount: txnData.amount,
        category: txnData.category,
        payment_method: txnData.payment_method || "cash_override",
        tax_deduction: txnData.tax >= 0 ? txnData.tax : 0,
      };
      const desc = txnData.description.trim();
      if (desc) body.description = desc;
      if (txnData.doctor_id > 0) body.doctor_id = txnData.doctor_id;
      if (txnData.patient_id > 0) body.patient_id = txnData.patient_id;

      const result = (await api.post(
        billingTransactionOverridePath(),
        body,
      )) as {
        success?: boolean;
        message?: string;
      };

      if (result && result.success === false) {
        alert(
          typeof result.message === "string"
            ? result.message
            : "Record was not accepted.",
        );
        return;
      }

      alert(
        typeof result.message === "string" && result.message
          ? result.message
          : "Administrative record created successfully.",
      );
      setIsModalOpen(false);
      setTxnData(initialTxnOverride());
      void fetchBillingSummary();
      fetchPayments();
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Record submission failed. Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-container billing-page">
      <div className="page-header billing-page-header">
        <div className="billing-page-header-text">
          <h1 className="page-title">Billing & Revenue</h1>
          <p className="page-subtitle">Transactional oversight and platform-wide financial performance.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleGenerateReport} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Download size={18} />
          <span>Generate Revenue Report</span>
        </button>
      </div>

      <div className="billing-stats-grid">
      <StatCard title="Total Revenue" value={stats.totalRevenue} change="22%" trend="up" icon={<IndianRupee size={20} />} />
        <StatCard title="MRR" value={stats.mrr} change="15%" trend="up" icon={<TrendingUp size={20} />} />
        <StatCard title="Estimated ARR" value={stats.arr} change="18%" trend="up" icon={<Calendar size={20} />} />
        <StatCard title="Late Payments" value={stats.overdue} change="4%" trend="down" icon={<Clock size={20} />} />
        <StatCard title="Refunded" value={stats.refunds} change="10%" trend="up" icon={<XCircle size={20} />} />
      </div>

      <div className="billing-toolbar">
         <button
            type="button"
            className="btn btn-primary billing-override-btn"
            onClick={() => {
              setTxnData({
                ...initialTxnOverride(),
                clinic_id: selectedClinic
                  ? Number.parseInt(selectedClinic, 10) || 0
                  : 0,
              });
              setIsModalOpen(true);
            }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <Plus size={18} />
            <span>Administrative Transaction Override</span>
         </button>
      </div>

      <div className="card table-card billing-table-card">
        <div className="table-filters-premium">
          <div className="filter-left">
            <h3 className="card-title">Transaction History</h3>
          </div>
          <div className="filter-right">
             <div className="search-bar-mini">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Order ID or Clinic..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
            <select 
              className="modern-select-mini"
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              style={{ minWidth: '140px' }}
            >
              <option value="">All plan types</option>
              <option value="Clinic">Clinic</option>
              <option value="Expert">Expert</option>
              <option value="Individual">Individual</option>
              <option value="Add On">Add On</option>
            </select>
            <select 
              className="modern-select-mini"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ minWidth: '130px' }}
            >
              <option value="">All methods</option>
              <option value="razorpay">Razorpay</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
            <select 
              className="modern-select-mini"
              value={subStatus}
              onChange={(e) => setSubStatus(e.target.value)}
              style={{ minWidth: '120px' }}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select 
              className="modern-select-mini"
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="">All Centers</option>
              {clinics.map((clinic: any) => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
            <button type="button" className="btn-icon-sq-mini" title="Apply filters" onClick={() => void fetchPayments()}>
               <Filter size={16} />
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="premium-data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Medical Center</th>
                <th>Amount</th>
                <th>Plan Tier</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 0', textAlign: 'center' }}>
                    <Loader2 className="animate-spin" size={32} color="var(--primary)" />
                  </td>
                </tr>
              ) : payments.length > 0 ? (
                payments.map((payment) => {
                  const st = payment.status;
                  const badgeClass =
                    st === "active"
                      ? "success"
                      : st === "expired" || st === "cancelled"
                        ? "danger"
                        : st === "pending"
                          ? "warning"
                          : "warning";
                  const planLabel =
                    payment.plan_category &&
                    payment.plan_tier &&
                    payment.plan_category !== payment.plan_tier
                      ? `${payment.plan_tier} · ${payment.plan_category}`
                      : payment.plan_tier;
                  return (
                  <tr key={payment.rowKey}>
                    <td className="txn-id-cell" title={payment.order_id}>
                      {payment.order_id.length > 18
                        ? `${payment.order_id.slice(0, 14)}…`
                        : payment.order_id}
                      {payment.is_override ? (
                        <span className="plan-badge-mini" style={{ marginLeft: 8 }}>
                          Override
                        </span>
                      ) : null}
                    </td>
                    <td className="clinic-name-cell">{payment.medical_center}</td>
                    <td className="amount-cell">₹{payment.amount.toFixed(2)}</td>
                    <td><span className="plan-badge-mini">{planLabel}</span></td>
                    <td className="date-cell">
                      {payment.date
                        ? new Date(payment.date).toLocaleString()
                        : "N/A"}
                    </td>
                    <td>
                      <span className={`badge-status badge-${badgeClass}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>
                        {payment.receipt ?? "—"}
                      </span>
                      <button type="button" className="btn-icon-flat" title="Receipt reference">
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No transactions found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            padding: '16px 32px',
            borderTop: '1px solid var(--border-light)',
            background: 'var(--gray-50, #f8fafc)',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {txTotal > 0
              ? `${txTotal} record${txTotal === 1 ? '' : 's'} · Page ${txPage} of ${txPages}`
              : 'No records'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || txPage <= 1}
              onClick={() => goTxPage(txPage - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={loading || txPage >= txPages}
              onClick={() => goTxPage(txPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Revenue report — date range + PDF download */}
      {showReportModal && (
        <div
          className="modal-overlay animate-in"
          role="presentation"
          onClick={() => !reportLoading && setShowReportModal(false)}
        >
          <div
            className="modal-content glass-modal animate-in"
            style={{ maxWidth: "440px", padding: "0" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="revenue-report-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: "24px 32px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <FileText size={24} color="var(--primary)" />
                <div>
                  <h3
                    id="revenue-report-modal-title"
                    style={{ fontSize: "18px", fontWeight: 800 }}
                  >
                    Generate revenue report
                  </h3>
                  <p style={{ fontSize: "13px", color: "#64748B" }}>
                    Choose the period. A PDF will download with the breakdown from
                    the server.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-close"
                disabled={reportLoading}
                onClick={() => setShowReportModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleDownloadRevenueReport}
              className="modal-body"
              style={{ padding: "32px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "20px",
                }}
              >
                <div className="form-group">
                  <label className="form-label" htmlFor="report-from-date">
                    From date
                  </label>
                  <input
                    id="report-from-date"
                    type="date"
                    className="form-input"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                    required
                    disabled={reportLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="report-to-date">
                    To date
                  </label>
                  <input
                    id="report-to-date"
                    type="date"
                    className="form-input"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                    required
                    disabled={reportLoading}
                  />
                </div>
              </div>

              {reportError ? (
                <p
                  style={{
                    marginTop: "16px",
                    fontSize: "13px",
                    color: "#b91c1c",
                  }}
                  role="alert"
                >
                  {reportError}
                </p>
              ) : null}

              <div style={{ marginTop: "28px", display: "flex", gap: "16px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  disabled={reportLoading}
                  onClick={() => setShowReportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  disabled={reportLoading}
                >
                  {reportLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Download size={18} />
                  )}
                  <span>Download PDF</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Reconciliation Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay animate-in"
          role="presentation"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-content glass-modal animate-in"
            style={{ maxWidth: "600px", padding: "0" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="billing-override-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ padding: '24px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CreditCard size={24} color="var(--primary)" />
                <div>
                  <h3 id="billing-override-modal-title" style={{ fontSize: "18px", fontWeight: 800 }}>
                    Administrative Record
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748B' }}>Manually reconcile out-of-band clinic transactions.</p>
                </div>
              </div>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTxn} className="modal-body" style={{ padding: '32px' }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Clinic</label>
                <select
                  className="form-input"
                  value={txnData.clinic_id > 0 ? String(txnData.clinic_id) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setTxnData({
                      ...txnData,
                      clinic_id: v ? parseInt(v, 10) : 0,
                      doctor_id: 0,
                      patient_id: 0,
                    });
                  }}
                  required
                >
                  <option value="">Select clinic</option>
                  {clinics.map((clinic: { id?: number; name?: string }) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name ?? `Clinic #${clinic.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                   <label className="form-label">Transaction Amount (₹)</label>
                   <input 
                    type="number" 
                    className="form-input" 
                    min={0}
                    step="0.01"
                    value={txnData.amount === 0 ? "" : txnData.amount}
                    onChange={(e) => setTxnData({...txnData, amount: parseFloat(e.target.value) || 0})}
                    placeholder="500"
                    required
                   />
                </div>
                <div className="form-group">
                   <label className="form-label">Category</label>
                   <select 
                    className="form-input"
                    value={txnData.category}
                    onChange={(e) => setTxnData({...txnData, category: e.target.value})}
                   >
                    <option value="Consultation">Consultation</option>
                    <option value="Procedure">Procedure</option>
                    <option value="Test">Test</option>
                    <option value="Medicine">Medicine</option>
                    <option value="Other">Other</option>
                   </select>
                </div>
                <div className="form-group">
                   <label className="form-label">Payment Method</label>
                   <select 
                    className="form-input"
                    value={txnData.payment_method}
                    onChange={(e) => setTxnData({...txnData, payment_method: e.target.value})}
                   >
                    <option value="cash_override">Cash Override</option>
                    <option value="bank_transfer">Bank transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                   </select>
                </div>
                <div className="form-group">
                   <label className="form-label">Tax Deduction (₹)</label>
                   <input 
                    type="number" 
                    className="form-input" 
                    min={0}
                    step="0.01"
                    value={txnData.tax}
                    onChange={(e) => setTxnData({...txnData, tax: parseFloat(e.target.value) || 0})}
                    placeholder="0"
                   />
                </div>
                <div className="form-group">
                  <label className="form-label">Attributing doctor</label>
                  <select
                    className="form-input"
                    value={txnData.doctor_id > 0 ? String(txnData.doctor_id) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTxnData({
                        ...txnData,
                        doctor_id: v ? parseInt(v, 10) : 0,
                      });
                    }}
                    disabled={doctorsLoading}
                  >
                    <option value="">
                      {doctorsLoading ? "Loading doctors…" : "Select a doctor (optional)"}
                    </option>
                    {doctorsForTxn.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                        {d.specialisation ? ` · ${d.specialisation}` : ""}
                        {d.clinic_name ? ` — ${d.clinic_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Patient</label>
                  <select
                    className="form-input"
                    value={txnData.patient_id > 0 ? String(txnData.patient_id) : ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setTxnData({
                        ...txnData,
                        patient_id: v ? parseInt(v, 10) : 0,
                      });
                    }}
                    disabled={patientsLoading}
                  >
                    <option value="">
                      {patientsLoading ? "Loading patients…" : "Select a patient (optional)"}
                    </option>
                    {patientsForTxn.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.phone_number ? ` · ${p.phone_number}` : ""}
                        {p.clinic_name ? ` — ${p.clinic_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                 <label className="form-label">Transaction Description</label>
                 <textarea 
                  className="form-input" 
                  value={txnData.description}
                  onChange={(e) => setTxnData({...txnData, description: e.target.value})}
                  placeholder="In-clinic consultation fee for general medicine..."
                  style={{ minHeight: '80px' }}
                 />
              </div>

              <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
                 <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                 <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={creating}>
                    {creating ? <Loader2 className="animate-spin" size={18} /> : "Finalize Record"}
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
