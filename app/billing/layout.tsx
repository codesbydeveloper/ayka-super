import type { ReactNode } from "react";
import "./Billing.css";

/**
 * Load billing styles with the /billing route segment (server layout).
 * Keeps globals.css + Tailwind as the base, while Billing.css scopes to this area
 * without depending on client-bundle CSS order after navigation.
 */
export default function BillingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
