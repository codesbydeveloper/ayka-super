import type { ReactNode } from "react";

export default function LeadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className="main-content-band">{children}</div>;
}
