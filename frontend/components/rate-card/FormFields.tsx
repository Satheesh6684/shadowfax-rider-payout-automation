import { FieldError, UseFormRegisterReturn } from "react-hook-form";

interface FieldWrapperProps {
  label: string;
  error?: FieldError;
  children: React.ReactNode;
  hint?: string;
}

export function FieldWrapper({ label, error, children, hint }: FieldWrapperProps) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

interface TextFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  list?: string;
  disabled?: boolean;
}

export function TextField({ label, registration, error, placeholder, list, disabled }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <input
        {...registration}
        list={list}
        disabled={disabled}
        placeholder={placeholder}
        className={inputClass}
      />
    </FieldWrapper>
  );
}

interface NumberFieldProps {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  placeholder?: string;
  step?: string;
}

export function NumberField({ label, registration, error, placeholder, step = "1" }: NumberFieldProps) {
  return (
    <FieldWrapper label={label} error={error}>
      <input
        type="number"
        step={step}
        {...registration}
        placeholder={placeholder}
        className={inputClass}
      />
    </FieldWrapper>
  );
}
