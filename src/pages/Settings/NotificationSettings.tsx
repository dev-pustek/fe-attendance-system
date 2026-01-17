import { useEffect, useState, useMemo } from "react";
import PageMeta from "../../components/atoms/PageMeta";
import PageBreadcrumb from "../../components/molecules/PageBreadcrumb";
import notificationService from "../../api/services/notificationService";
import { NotificationSetting } from "../../api/types/notification";
import { showSuccess, showError } from "../../utils/toast";
import Switch from "../../components/atoms/Switch";
import { MailIcon, AlertIcon, GridIcon } from "../../components/atoms/Icons";
import { useDebounce } from "../../hooks/useDebounce";

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await notificationService.getSettings();
      setSettings(res.data.data);
    } catch (error) {
      console.error(error);
      showError(error, "Failed to load notification settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (templateId: number, currentStatus: boolean) => {
    try {
        // Optimistic update
        setSettings(prev => prev.map(s => 
            s.templateId === templateId ? { ...s, isEnabled: !currentStatus } : s
        ));

        await notificationService.updateSetting(templateId, { isEnabled: !currentStatus });
        showSuccess("Preference updated");
    } catch (error) {
        // Revert on failure
        setSettings(prev => prev.map(s => 
            s.templateId === templateId ? { ...s, isEnabled: currentStatus } : s
        ));
        showError(error, "Failed to update preference");
    }
  };

  const filteredSettings = useMemo(() => {
     if (!debouncedSearch) return settings;
     return settings.filter(s => s.templateName.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [settings, debouncedSearch]);

  return (
    <>
      <PageMeta
        title="Notification Settings"
        description="Manage your notification preferences."
      />
      <PageBreadcrumb pageTitle="Notification Settings" />

      <div className="space-y-6">
         {/* Header & Search */}
         <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Control which notifications you receive and how.</p>
            </div>
            
            <div className="w-full sm:max-w-xs relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <GridIcon className="size-4" />
                </div>
                <input
                    type="text"
                    placeholder="Search settings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-brand-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-white"
                />
            </div>
         </div>

        {/* Content */}
        {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
                ))}
            </div>
        ) : filteredSettings.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                <div className="size-12 rounded-full bg-gray-50 flex items-center justify-center mb-3 dark:bg-white/5">
                    <AlertIcon className="size-6 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">No settings found matching your search.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSettings.map((setting) => (
                    <div 
                        key={setting.templateId} 
                        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-5 transition-all hover:shadow-md ${
                            setting.isEnabled 
                                ? 'bg-white border-brand-200 dark:bg-white/[0.03] dark:border-brand-500/30' 
                                : 'bg-gray-50/50 border-gray-200 dark:bg-white/[0.01] dark:border-white/[0.05]'
                        }`}
                    >
                        {/* Status Indicator Stripe */}
                        <div className={`absolute top-0 left-0 h-1 w-full transition-colors ${
                            setting.isEnabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />

                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                    setting.isEnabled 
                                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400' 
                                        : 'bg-gray-100 text-gray-400 dark:bg-white/5'
                                }`}>
                                   <MailIcon className="size-5" />
                                </div>
                                <div>
                                    <h3 className={`font-semibold text-sm transition-colors ${
                                        setting.isEnabled ? 'text-gray-900 dark:text-white' : 'text-gray-500'
                                    }`}>
                                        {setting.templateName}
                                    </h3>
                                    <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mt-0.5">
                                        {(setting.preferredChannels || "").replace(/,/g, ' • ')}
                                    </p>
                                </div>
                            </div>
                            <Switch 
                                checked={setting.isEnabled}
                                onChange={() => handleToggle(setting.templateId, setting.isEnabled)}
                            />
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                             <p className="text-xs text-gray-500 leading-relaxed">
                                {setting.isEnabled 
                                    ? "You will receive notifications for this event via your preferred channels." 
                                    : "Notifications for this event are currently muted."}
                             </p>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </>
  );
}
