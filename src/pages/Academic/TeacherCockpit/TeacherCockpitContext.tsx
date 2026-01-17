import React, { createContext, useContext, ReactNode } from "react";
import { useParams } from "react-router";
import { useEmployee } from "../../../api/hooks/useProfiles";
import { EmployeeProfile } from "../../../api/types/profiles";

interface TeacherCockpitContextType {
    employeeId: string;
    employeeDetails: EmployeeProfile | null; 
    isLoading: boolean;
}

const TeacherCockpitContext = createContext<TeacherCockpitContextType | undefined>(undefined);

export const TeacherCockpitProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { employeeId } = useParams<{ employeeId: string }>();

    const { data: employeeData, isLoading } = useEmployee(employeeId || "");
    
    // The apiClient interceptor already unwraps the response.data.data into the main object for single items
    // So employeeData IS the employee profile (augmented with metadata)
    const employeeDetails = employeeData || null;
    
    return (
        <TeacherCockpitContext.Provider value={{ 
            employeeId: employeeId || "",
            employeeDetails,
            isLoading 
        }}>
            {children}
        </TeacherCockpitContext.Provider>
    );
};

export const useTeacherCockpit = () => {
    const context = useContext(TeacherCockpitContext);
    if (!context) {
        throw new Error("useTeacherCockpit must be used within a TeacherCockpitProvider");
    }
    return context;
};
