import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";

const TextAreaInput: React.FC = () => {
  return (
    <ComponentCard title="Textarea Input">
      <div className="space-y-6">
        <div>
          <Label>Message</Label>
          <textarea
            rows={4}
            placeholder="Type your message"
            className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90"
          ></textarea>
        </div>
      </div>
    </ComponentCard>
  );
};

export default TextAreaInput;
