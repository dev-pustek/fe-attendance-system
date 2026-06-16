import React from "react";
import { Link } from "react-router";
import ThemeTogglerTwo from "../molecules/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute top-40 right-20 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 py-12 lg:px-8">
        <div className="flex flex-col lg:flex-row rounded-3xl overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-2xl border border-white/20 dark:border-white/10">
          
          {/* Left Side - Form Container */}
          <div className="flex-1 px-8 py-8 sm:px-16 lg:py-10">
            {children}
          </div>

          {/* Right Side - Branding/Hero (Hidden on small screens) */}
          <div className="hidden lg:flex lg:w-1/2 relative flex-col items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-brand-600 to-indigo-700">
            {/* Subtle overlay pattern */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <Link to="/" className="group flex flex-col items-center mb-8">
                <div className="relative rounded-3xl overflow-hidden bg-white shadow-2xl shadow-brand-900/50 mb-6 p-3 transition-transform duration-300 group-hover:scale-105">
                  <img
                    src="/logo-pwa.png"
                    alt="SIAPUS Logo"
                    width={120}
                    height={120}
                    className="object-contain"
                  />
                  <div className="absolute inset-0 border border-white/20 rounded-3xl" />
                </div>
                <h2 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
                  SIAPUS
                </h2>
              </Link>
              <p className="text-lg text-brand-100 font-medium max-w-md leading-relaxed drop-shadow-sm">
                Sistem Informasi Absensi Pustek
                <br />
                <span className="text-white font-semibold">Modern, Cepat, & Efisien</span>
              </p>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-10 right-10 w-24 h-24 rounded-full border border-white/10 bg-white/5 backdrop-blur-md" />
            <div className="absolute bottom-20 left-10 w-32 h-32 rounded-full border border-white/10 bg-white/5 backdrop-blur-md" />
          </div>
        </div>
      </div>

      <div className="fixed z-50 bottom-6 right-6">
        <ThemeTogglerTwo />
      </div>
    </div>
  );
}
