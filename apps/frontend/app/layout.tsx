import "../styles/globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth-provider";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Survey Platform",
  description: "Modular, developer-friendly survey platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Nav />
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
