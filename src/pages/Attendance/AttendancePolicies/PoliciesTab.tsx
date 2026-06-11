import React, { useState, useEffect } from "react";
import { CheckCircleIcon } from "../../../components/atoms/Icons";
import Button from "../../../components/atoms/Button";
import { useAttendanceRules } from "../../../api/hooks/useRules";
import { AttendanceRuleType, RuleContextType, CreateAttendanceRuleDto } from "../../../api/types/rules";
import Switch from "../../../components/atoms/Switch";
import { showSuccess, showError } from "../../../utils/toast";
import GeoFencingSettings from "./GeoFencingSettings";
import NetworkIpSettings from "./NetworkIpSettings";

interface PoliciesTabProps {
  contextId?: number;
  selectedContext: { type: string; id: number; name: string };
  onOverride?: () => void;
}

const PoliciesTab: React.FC<PoliciesTabProps> = ({ contextId, selectedContext, onOverride }) => {
  const { data: rulesData, createMutation, updateMutation, isLoading, refetch } = useAttendanceRules(
    contextId ? { contextId, limit: 100 } : undefined
  );

  // Memoize rules to verify stable dependency for useEffect
  const rules = React.useMemo(() => rulesData?.data || [], [rulesData]);

  // Local state for form values
  const [formValues, setFormValues] = useState({
    [AttendanceRuleType.LATE_TOLERANCE]: "15",
    [AttendanceRuleType.ABSENT_THRESHOLD]: "180",
    [AttendanceRuleType.CHECKIN_WINDOW_START]: "60", // Minutes before start
    [AttendanceRuleType.REQUIRE_PHOTO_EVIDENCE]: "false",
    [AttendanceRuleType.REQUIRE_GEO_LOCATION]: "false",
    [AttendanceRuleType.REQUIRE_QR_CODE]: "false",
    [AttendanceRuleType.DYNAMIC_TEACHER_SCHEDULE]: "false",
  });

  // Load initial values from API if rules exist
  useEffect(() => {
    if (rules.length > 0) {
      setFormValues(prev => {
        const newValues = { ...prev };
        let hasChanges = false;
        rules.forEach(rule => {
          const type = rule.ruleType as keyof typeof newValues;
          if (Object.keys(newValues).includes(rule.ruleType) && String(newValues[type]) !== String(rule.ruleValue)) {
            newValues[type] = String(rule.ruleValue);
            hasChanges = true;
          }
        });
        return hasChanges ? newValues : prev;
      });
    }
  }, [rules]);

  const handleSave = async () => {
    // Critical Guard: If we don't have a contextId, we risk creating duplicate rules because we haven't loaded existing ones.
    if (!contextId && selectedContext.type !== RuleContextType.GLOBAL) {
        console.warn("Attempting to save without Context ID - Potentially unsafe");
        if (!contextId) { 
             showError("Context not loaded. Please refresh or try again.", "Integration Error");
             return;
        }
    }

    try {
      const changes: Promise<unknown>[] = [];
      
      // strict check: log available rules for debugging
      console.log("Current Rules:", rules);
      console.log("Form Values:", formValues);

      Object.entries(formValues).forEach(([type, value]) => {
        const existingRule = rules.find(r => r.ruleType === type);
        const stringValue = String(value);

        if (existingRule) {
             // Rule exists: Check if value changed
             if (String(existingRule.ruleValue) !== stringValue) {
                 console.log(`Updating Rule [${type}] from ${existingRule.ruleValue} to ${stringValue}`);
                 changes.push(
                     updateMutation.mutateAsync({ 
                         id: existingRule.id, 
                         data: { ruleValue: stringValue, isActive: true } 
                     })
                 );
             }
        } else {
             // Rule does not exist: Create it
             // CRITICAL FIX: Do NOT create if we don't have a contextId, unless we are absolutely sure.
             if (!contextId) {
                 console.warn(`Skipping Create Rule [${type}]: No contextId available.`);
                 return; 
             }

             console.log(`Creating New Rule [${type}] with value ${stringValue}`);
             
             const payload: CreateAttendanceRuleDto = {
                 ruleType: type,
                 ruleValue: stringValue,
                 isActive: true,
                 contextType: selectedContext.type,
                 contextId, 
             };

             if (selectedContext.type === RuleContextType.GRADE) {
                 payload.gradeId = selectedContext.id;
             } else if (selectedContext.type === RuleContextType.EDUCATION_LEVEL) {
                 payload.educationLevelId = selectedContext.id;
             }
             
             changes.push(createMutation.mutateAsync(payload));
        }
      });

      if (changes.length === 0) {
          showSuccess("No changes to save");
          return;
      }

      await Promise.all(changes);
      showSuccess(`Successfully updated ${changes.length} policies`);
      refetch();
    } catch (e) {
      console.error("Save Error:", e);
      showError(e, "Failed to update policies");
    }
  };

  const handleChange = (type: string, val: string | number | boolean) => {
    setFormValues(prev => ({ ...prev, [type]: String(val) }));
  };

  if (isLoading && contextId) return <div className="p-8 text-center text-gray-400">Loading policies...</div>;

  const isInherited = !contextId && selectedContext.type !== RuleContextType.GLOBAL;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-gray-100">General Policies</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {isInherited 
                    ? "Viewing inherited rules. Override to customize." 
                    : `Configure attendance limits and requirements for ${selectedContext.name}.`}
            </p>
         </div>

         <div className="flex items-center gap-3">
             {isInherited && (
                 <Button onClick={onOverride} className="bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 shadow-sm">
                     <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                     Override Settings
                 </Button>
             )}

             <Button 
                onClick={handleSave} 
                disabled={isInherited || createMutation.isPending || updateMutation.isPending}
                className={isInherited ? "opacity-50 cursor-not-allowed bg-gray-300 text-white border-transparent" : ""}
             >
                <CheckCircleIcon className="w-4 h-4 mr-2" />
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
             </Button>
         </div>
      </div>
      
      {isInherited && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-500/30 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                  <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">Using Inherited Rules</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      These settings are currently inherited from the Global or Education Level configuration. 
                      You cannot edit them directly. Click <b>Override Settings</b> to create a custom configuration for this {selectedContext.type.toLowerCase().replace('_', ' ')}.
                  </p>
              </div>
          </div>
      )}

      <div className={`space-y-6 ${isInherited ? 'opacity-60 pointer-events-none grayscale-[0.5]' : ''}`}>
        
        {/* Time Limits */}
        <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-6">
            <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-white/10 pb-3 mb-4 flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-500"></span>
                Time Limits
            </h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Late Tolerance */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Late Tolerance (Min)</label>
                    <p className="text-xs text-gray-400 mb-2 truncate" title="Grace period after start time before marked as 'Late'.">Grace period before 'Late'.</p>
                    <input
                        type="number"
                        min="0"
                        className="w-full border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-sm p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                        value={formValues[AttendanceRuleType.LATE_TOLERANCE]}
                        onChange={e => handleChange(AttendanceRuleType.LATE_TOLERANCE, e.target.value)}
                        disabled={isInherited}
                    />
                 </div>

                 {/* Absent Threshold */}
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Absent Threshold (Min)</label>
                    <p className="text-xs text-gray-400 mb-2 truncate" title="Minutes late before automatically marked as 'Absent'.">Mins late before 'Absent'.</p>
                    <input
                        type="number"
                        min="0"
                        className="w-full border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-sm p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                        value={formValues[AttendanceRuleType.ABSENT_THRESHOLD]}
                        onChange={e => handleChange(AttendanceRuleType.ABSENT_THRESHOLD, e.target.value)}
                        disabled={isInherited}
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check-in Window (Min)</label>
                    <p className="text-xs text-gray-400 mb-2 truncate" title="How many minutes before start time check-in is allowed.">Mins before start allowed.</p>
                    <input
                        type="number"
                        min="0"
                        className="w-full border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-white/5 text-sm p-3 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                        value={formValues[AttendanceRuleType.CHECKIN_WINDOW_START]}
                        onChange={e => handleChange(AttendanceRuleType.CHECKIN_WINDOW_START, e.target.value)}
                        disabled={isInherited}
                    />
                 </div>
            </div>
        </div>

        {/* Requirements */}
        <div className="bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-2xl p-6">
             <h5 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-200 dark:border-white/10 pb-3 mb-4 flex items-center gap-2">
                <span className="size-2 rounded-full bg-indigo-500"></span>
                Requirements
             </h5>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm block">Require Selfie Evidence</span>
                        <span className="text-xs text-gray-500">Users must take a photo when checking in/out.</span>
                    </div>
                    <Switch 
                        checked={formValues[AttendanceRuleType.REQUIRE_PHOTO_EVIDENCE] === "true"}
                        onChange={checked => handleChange(AttendanceRuleType.REQUIRE_PHOTO_EVIDENCE, String(checked))}
                        disabled={isInherited}
                    />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm block">Require Geo-Location</span>
                        <span className="text-xs text-gray-500">Users must grant GPS location access to check in.</span>
                    </div>
                    <Switch 
                        checked={formValues[AttendanceRuleType.REQUIRE_GEO_LOCATION] === "true"}
                        onChange={checked => handleChange(AttendanceRuleType.REQUIRE_GEO_LOCATION, String(checked))}
                        disabled={isInherited}
                    />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm block">Require QR Code</span>
                        <span className="text-xs text-gray-500">Users must use QR code scanning to check in at the gate.</span>
                    </div>
                    <Switch 
                        checked={formValues[AttendanceRuleType.REQUIRE_QR_CODE] === "true"}
                        onChange={checked => handleChange(AttendanceRuleType.REQUIRE_QR_CODE, String(checked))}
                        disabled={isInherited}
                    />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                    <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-sm block">Dynamic Teacher Schedule</span>
                        <span className="text-xs text-gray-500">Teachers' check-in time depends on their first class schedule.</span>
                    </div>
                    <Switch 
                        checked={formValues[AttendanceRuleType.DYNAMIC_TEACHER_SCHEDULE] === "true"}
                        onChange={checked => handleChange(AttendanceRuleType.DYNAMIC_TEACHER_SCHEDULE, String(checked))}
                        disabled={isInherited}
                    />
                 </div>
             </div>
        </div>

      </div>

      {selectedContext.type === RuleContextType.GLOBAL && (
          <>
            <GeoFencingSettings />
            <NetworkIpSettings />
          </>
      )}
    </div>
  );
};

export default PoliciesTab;
