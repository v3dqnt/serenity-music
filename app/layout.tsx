import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

export const metadata: Metadata = {
    title: "Serenity — Your High-Fidelity Sanctuary",
    description: "Stream and download music with premium audio quality.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${geistMono.variable} antialiased font-sans`}>
                {children}
            </body>
        </html>
    );
}
