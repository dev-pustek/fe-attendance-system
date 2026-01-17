import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";

const RadioButtons: React.FC = () => {
  return (
    <ComponentCard title="Radio Buttons">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <input
            type="radio"
            id="radio1"
            name="radioGroup"
            className="w-5 h-5 border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          <Label htmlFor="radio1" className="mb-0">
            Option 1
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="radio"
            id="radio2"
            name="radioGroup"
            className="w-5 h-5 border-gray-300 text-brand-500 focus:ring-brand-500"
            defaultChecked
          />
          <Label htmlFor="radio2" className="mb-0">
            Option 2
          </Label>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="radio"
            id="radio3"
            name="radioGroup"
            className="w-5 h-5 border-gray-300 text-brand-500 focus:ring-brand-500"
            disabled
          />
          <Label htmlFor="radio3" className="mb-0 opacity-50">
            Disabled Option
          </Label>
        </div>
      </div>
    </ComponentCard>
  );
};

export default RadioButtons;
