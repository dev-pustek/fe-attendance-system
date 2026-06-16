import React, { useEffect } from "react";
import PageBreadcrumb from "../../../components/molecules/PageBreadcrumb";
import { useCurriculumWizardStore } from "../../../store/curriculumWizardStore";
import Step1_ClassSelector from "./Step1_ClassSelector";
import Step2_SubjectMixer from "./Step2_SubjectMixer";
import Step3_TeacherAssignment from "./Step3_TeacherAssignment";
import { CheckLineIcon, GroupIcon, DocsIcon, UserIcon } from "../../../components/atoms/Icons";

const StepIndicator: React.FC<{ 
  step: number; 
  title: string; 
  icon: React.ReactNode; 
  isActive: boolean; 
  isCompleted: boolean;
}> = ({ title, icon, isActive, isCompleted }) => (
  <div className={`flex items-center gap-3 ${isActive ? "text-brand-500" : isCompleted ? "text-success-500" : "text-gray-400 dark:text-gray-600"}`}>
    <div className={`flex size-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
      isActive ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : 
      isCompleted ? "border-success-500 bg-success-50 dark:bg-success-500/10" : 
      "border-gray-200 dark:border-white/10"
    }`}>
      {isCompleted ? <CheckLineIcon className="size-5" /> : icon}
    </div>
    <div className="hidden sm:block">
      <p className="text-[10px] uppercase font-bold tracking-widest leading-none mb-1 opacity-50">Langkah</p>
      <p className="text-sm font-bold truncate">{title}</p>
    </div>
  </div>
);

const CurriculumConfigurator: React.FC = () => {
  const { currentStep, reset } = useCurriculumWizardStore();

  useEffect(() => {
    const handleBeforeUnload = () => {
        sessionStorage.setItem('is_curriculum_refresh', 'true');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clear refresh flag on mount
    sessionStorage.removeItem('is_curriculum_refresh');

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        
        // If we contain the refresh flag, we are refreshing, so DO NOT reset.
        // If we do NOT have the flag, we are navigating away (unmounting), so RESET.
        if (!sessionStorage.getItem('is_curriculum_refresh')) {
            reset();
        }
    };
  }, [reset]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb pageTitle="Konfigurator Kurikulum" />

      {/* Stepper Header */}
      <div className="hidden md:block mb-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
        <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none">
          <StepIndicator 
            step={1} 
            title="Pemilihan Kelas" 
            icon={<GroupIcon className="size-5" />} 
            isActive={currentStep === 1} 
            isCompleted={currentStep > 1} 
          />
          <div className="h-px flex-1 bg-gray-100 dark:bg-white/5 mx-4 min-w-[30px]" />
          <StepIndicator 
            step={2} 
            title="Penyusunan Mata Pelajaran" 
            icon={<DocsIcon className="size-5" />} 
            isActive={currentStep === 2} 
            isCompleted={currentStep > 2} 
          />
          <div className="h-px flex-1 bg-gray-100 dark:bg-white/5 mx-4 min-w-[30px]" />
          <StepIndicator 
            step={3} 
            title="Penugasan Guru" 
            icon={<UserIcon className="size-5" />} 
            isActive={currentStep === 3} 
            isCompleted={currentStep > 3} 
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[600px]">
        {currentStep === 1 && <Step1_ClassSelector />}
        {currentStep === 2 && <Step2_SubjectMixer />}
        {currentStep === 3 && <Step3_TeacherAssignment />}
      </div>
    </div>
  );
};

export default CurriculumConfigurator;
