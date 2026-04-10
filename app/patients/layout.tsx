import type { ReactNode } from "react";

export default function PatientsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="main-content-band">{children}</div>;
}
