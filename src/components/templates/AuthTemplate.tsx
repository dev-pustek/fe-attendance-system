import React from "react";
import GridShape from "../atoms/GridShape";
import { Link } from "react-router";
import ThemeTogglerTwo from "../molecules/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center max-w-xs">
              <Link to="/" className="flex flex-col items-center mb-6">
                <img
                  src="/logo-pwa.png"
                  alt="Logo"
                  width={120}
                  height={120}
                  className="mb-4 rounded-3xl shadow-2xl shadow-brand-500/20"
                />
                <h2 className="text-3xl font-bold tracking-tighter text-white">
                  Visia
                </h2>
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60 font-medium">
                Visia - Sistem Management Absensi <br /> Modern & Efisien
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
