import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";

const FileInputExample: React.FC = () => {
  return (
    <ComponentCard title="File Input">
      <div className="space-y-6">
        <div>
          <Label>Default File Input</Label>
          <input
            type="file"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>
      </div>
    </ComponentCard>
  );
};

export default FileInputExample;
