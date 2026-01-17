import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";

const SelectInputs: React.FC = () => {
  return (
    <ComponentCard title="Select Inputs">
      <div className="space-y-6">
        <div>
          <Label>Default Select</Label>
          <select className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90">
            <option value="">Select option</option>
            <option value="1">Option 1</option>
            <option value="2">Option 2</option>
            <option value="3">Option 3</option>
          </select>
        </div>
      </div>
    </ComponentCard>
  );
};

export default SelectInputs;
