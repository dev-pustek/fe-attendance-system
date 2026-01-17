import React, { forwardRef } from "react";
import Label from "../atoms/Label";
import Input from "../atoms/InputField";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | boolean;
  hint?: string;
  required?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, required, id, ...props }, ref) => {
    return (
      <div>
        <Label htmlFor={id}>
          {label} {required && <span className="text-error-500">*</span>}
        </Label>
        <Input
          ref={ref}
          id={id}
          error={error}
          hint={hint}
          {...props}
        />
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export default FormInput;
