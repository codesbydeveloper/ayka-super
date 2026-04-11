import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayout from "@/components/AppLayout";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AYKA Central | SaaS Super Admin Panel",
  description:
    "Master control dashboard for the platform owner to manage all clinics, subscriptions, and platform-wide settings.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`ayka-admin ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${inter.className} min-h-full flex flex-col`}>
        <ToastProvider>
          <ConfirmProvider>
            <AppLayout>{children}</AppLayout>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
