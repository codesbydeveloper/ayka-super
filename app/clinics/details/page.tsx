import ClinicDetailsClient from "./Client";

/**
 * Server wrapper — all interactive UI lives in Client.tsx (useSearchParams + Suspense).
 * Route: /clinics/details?id=<clinicId>
 */
export default function ClinicDetailsPage() {
  return <ClinicDetailsClient />;
}
