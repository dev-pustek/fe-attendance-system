import React, { createContext, useContext, useState, ReactNode } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { academicService } from "../../../api/services/academicService";
import { Class, ClassSubject } from "../../../api/types";

interface ClassCockpitContextType {
  classId: string | undefined;
  activeTab: 'curriculum' | 'schedule' | 'overview' | 'enrollment' | 'analytics';
  setActiveTab: (tab: 'curriculum' | 'schedule' | 'overview' | 'enrollment' | 'analytics') => void;
  
  classDetails: Class | null;
  isLoadingClass: boolean;
  
  subjects: ClassSubject[];
  isLoadingSubjects: boolean;
  refreshSubjects: () => void;
  
  refreshAll: () => void;
}

const ClassCockpitContext = createContext<ClassCockpitContextType | undefined>(undefined);

export const useClassCockpit = () => {
  const context = useContext(ClassCockpitContext);
  if (!context) {
    throw new Error("useClassCockpit must be used within a ClassCockpitProvider");
  }
  return context;
};

export const ClassCockpitProvider = ({ children }: { children: ReactNode }) => {
  const { classId } = useParams<{ classId: string }>();
  const [activeTab, setActiveTab] = useState<'curriculum' | 'schedule' | 'overview' | 'enrollment' | 'analytics'>('overview');

  // 1. Fetch Class Details
  const { 
    data: classDetails, 
    isLoading: isLoadingClass, 
    refetch: refetchClass 
  } = useQuery({
    queryKey: ['academic', 'class', classId],
    queryFn: () => classId ? academicService.getClass(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // 2. Fetch Class Subjects (with Assignments)
  // We need to ensure the backend returns assignments. If not, we might need a separate call.
  // Assuming getClassSubjects returns nested relations or we can request them.
  // Based on current API, getClassSubjects takes classId.
  const {
    data: subjectsResponse,
    isLoading: isLoadingSubjects,
    refetch: refetchSubjects
  } = useQuery({
    queryKey: ['academic', 'class-subjects', classId],
    queryFn: () => classId ? academicService.getClassSubjects({ classId, limit: 100 }) : Promise.resolve({ data: [], meta: { page: 1, limit: 100, total: 0, totalPages: 0 }, statusCode: 200, message: "", timestamp: "" }),
    enabled: !!classId,
  });

  const subjects = subjectsResponse?.data || [];

  // 3. Fetch Academic Year Details if missing (but ID is present)
  // The 'getClass' response might exclude the full academicYear object, so we fetch it manually if needed.
  const academicYearId = classDetails?.academicYearId;
  const { data: academicYearData } = useQuery({
      queryKey: ['academic', 'year', academicYearId],
      queryFn: () => academicYearId ? academicService.getAcademicYearById(academicYearId) : Promise.resolve(null),
      enabled: !!academicYearId && !classDetails?.academicYear,
  });

  const enrichedClassDetails = React.useMemo(() => {
      if (!classDetails) return null;
      // If we already have the object, use it.
      if (classDetails.academicYear) return classDetails;
      // If we fetched it separately, merge it in.
      if (academicYearData) {
          // academicService.getAcademicYearById returns the object directly (due to client unwrapping)
          // or BaseResponse depending on how the type is defined vs runtime behavior.
          // Based on our previous fix, getAcademicYearById returns response.data (the object).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { ...classDetails, academicYear: (academicYearData as any).data || academicYearData };
      }
      return classDetails;
  }, [classDetails, academicYearData]);

  const refreshAll = () => {
    refetchClass();
    refetchSubjects();
  };

  return (
    <ClassCockpitContext.Provider
      value={{
        classId,
        activeTab,
        setActiveTab,
        classDetails: enrichedClassDetails || null,
        isLoadingClass,
        subjects: subjects as ClassSubject[],
        isLoadingSubjects,
        refreshSubjects: refetchSubjects,
        refreshAll,
      }}
    >
      {children}
    </ClassCockpitContext.Provider>
  );
};
