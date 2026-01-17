import React from "react";
import ComponentCard from "../../molecules/ComponentCard";
import Label from "../../atoms/Label";
import Input from "../../atoms/InputField";
import { EnvelopeIcon, LockIcon } from "../../atoms/Icons";

const InputGroup: React.FC = () => {
  return (
    <ComponentCard title="Input Group">
      <div className="space-y-6">
        <div>
          <Label>Email Address</Label>
          <div className="relative">
            <Input
              type="email"
              placeholder="info@example.com"
              className="pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <EnvelopeIcon className="text-gray-500 size-5" />
            </span>
          </div>
        </div>

        <div>
          <Label>Password</Label>
          <div className="relative">
            <Input
              type="password"
              placeholder="Enter password"
              className="pl-12"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <LockIcon className="text-gray-500 size-5" />
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
};

export default InputGroup;
