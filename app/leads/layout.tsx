import type { ReactNode } from "react";
import "../dashboard/Dashboard.css";
import "./Leads.css";

export default function LeadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="main-content-band">{children}</div>;
}
