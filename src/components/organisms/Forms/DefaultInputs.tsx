import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";
import Input from "../../atoms/InputField";

const DefaultInputs: React.FC = () => {
  return (
    <ComponentCard title="Default Inputs">
      <div className="space-y-6">
        <div>
          <Label>Default Input</Label>
          <Input type="text" placeholder="Default Input" />
        </div>
        <div>
          <Label>Active Input</Label>
          <Input
            type="text"
            placeholder="Active Input"
            className="border-brand-500 ring-4 ring-brand-500/10"
          />
        </div>
        <div>
          <Label>Disabled Input</Label>
          <Input type="text" placeholder="Disabled Input" disabled />
        </div>
      </div>
    </ComponentCard>
  );
};

export default DefaultInputs;
