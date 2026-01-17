import React, { useState } from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";

const ToggleSwitch: React.FC = () => {
  const [enabled, setEnabled] = useState(false);

  return (
    <ComponentCard title="Toggle Switch">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Label className="mb-0">Default Toggle</Label>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              enabled ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default ToggleSwitch;
