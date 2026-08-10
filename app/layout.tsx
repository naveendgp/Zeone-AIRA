import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Zeone — Never miss another customer", description: "Your AI Front Desk, made for Tamil Nadu businesses." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
