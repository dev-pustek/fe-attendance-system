import React from "react";
import { useAuthStore } from "../../store/authStore";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import StudentProfileForm from "./StudentProfileForm";
import EmployeeProfileForm from "./EmployeeProfileForm";

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
      <PageMeta title="My Profile" description="Manage your profile information." />
      <PageBreadcrumb pageTitle="My Profile" />

      <div className="bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-6 lg:p-10 shadow-sm max-w-7xl mx-auto">
        <div className="mb-8 border-b border-gray-100 dark:border-white/5 pb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your personal information and records.
          </p>
        </div>

        {isStudent ? (
          <StudentProfileForm />
        ) : isEmployee ? (
          <EmployeeProfileForm />
        ) : (
          <div className="p-8 text-center text-gray-500">
            Profile view is not available for your current role.
          </div>
        )}
      </div>
    </>
  );
}
