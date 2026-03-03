import type { Metadata } from "next";
import "../styles/index.css";

export const metadata: Metadata = {
  title: "Our Media Archive",
  description: "Private invite-only media archive",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
