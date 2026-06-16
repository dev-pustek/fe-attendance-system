import React from "react";
import { useAuthStore } from "../../store/authStore";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import StudentProfileForm from "./StudentProfileForm";
import EmployeeProfileForm from "./EmployeeProfileForm";
import UpdatePasswordForm from "./UpdatePasswordForm";

export default function MyProfile() {
  const { user } = useAuthStore();

  const isStudent = user?.userTypes?.includes("student");
  const isEmployee = user?.userTypes?.some(type => 
      ["admin", "super admin", "teacher", "staff", "headmaster"].includes(type.toLowerCase())
  ) || user?.roles?.some(role => 
      ["admin", "super admin", "teacher", "staff", "headmaster"].includes(role.name.toLowerCase())
  );

  return (
    <>
      <PageMeta title="Profil Saya" description="Kelola informasi profil Anda." />
      
      <div className="hidden sm:block">
        <PageBreadcrumb pageTitle="Profil Saya" />
      </div>

      <div className="space-y-3 sm:space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profil Saya</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Kelola informasi pribadi dan catatan Anda.</p>
          </div>
        </div>

        <div className="sm:bg-white sm:dark:bg-white/[0.02] sm:border sm:border-gray-100 sm:dark:border-white/5 sm:rounded-2xl sm:p-6 lg:p-10 sm:shadow-sm">


        {isStudent ? (
          <StudentProfileForm />
        ) : isEmployee ? (
          <EmployeeProfileForm />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Tampilan profil tidak tersedia untuk peran Anda saat ini.
          </div>
        )}
        
        <UpdatePasswordForm />
        </div>
      </div>
    </>
  );
}
