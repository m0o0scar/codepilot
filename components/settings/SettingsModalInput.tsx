import { FC, HTMLInputTypeAttribute, ReactNode, useState } from 'react';

export interface SettingsModalInputProps {
  value?: string;
  onChange?: (value: string) => void;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
  footer?: ReactNode;
}

export const SettingsModalInput: FC<SettingsModalInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  disabled,
  footer,
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <label className="form-control w-full">
      <label className="input input-bordered input-sm flex items-center gap-2">
        {label && <span className="whitespace-nowrap min-w-24">{label}</span>}
        <input
          className="grow"
          disabled={disabled}
          type={focused ? 'text' : type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </label>
      {(footer || error) && (
        <div className="label">
          {footer && <span className="label-text-alt opacity-50">{footer}</span>}
          {error && <span className="label-text-alt text-red-400">{error}</span>}
        </div>
      )}
    </label>
  );
};
