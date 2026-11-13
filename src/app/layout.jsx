import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: { default: "GymPilot", template: "%s · GymPilot" },
  description: "Gym members, fees, attendance and WhatsApp reminders in one place.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Toaster>{children}</Toaster>
      </body>
    </html>
  );
}
