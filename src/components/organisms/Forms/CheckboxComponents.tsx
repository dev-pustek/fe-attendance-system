import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Checkbox from "../../atoms/Checkbox";

const CheckboxComponents: React.FC = () => {
  return (
    <ComponentCard title="Checkbox Components">
      <div className="space-y-6">
        <Checkbox label="Default Checkbox" id="checkbox1" />
        <Checkbox label="Checked Checkbox" id="checkbox2" defaultChecked />
        <Checkbox label="Disabled Checkbox" id="checkbox3" disabled />
      </div>
    </ComponentCard>
  );
};

export default CheckboxComponents;
