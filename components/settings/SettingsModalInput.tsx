import { FC, HTMLInputTypeAttribute, ReactNode, useContext, useEffect, useState } from 'react';

import { SettingsContext, SettingsContextType } from './SettingsContext';

export const useSettingsInputValue = (key: keyof SettingsContextType['settings']) => {
  const context = useContext(SettingsContext);

  const [value, setValue] = useState('');
  const [trimmed, setTrimmed] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => setValue(context?.settings[key] || ''), [context?.isSettingModalOpen]);

  useEffect(() => setTrimmed(value.trim()), [value]);

  useEffect(() => setHasChanges((context?.settings[key] || '') !== trimmed), [trimmed]);

  return {
    value,
    onChange: setValue,
    trimmed,
    hasChanges,
  };
};

export interface SettingsModalInputProps {
  hook: ReturnType<typeof useSettingsInputValue>;
  type?: HTMLInputTypeAttribute;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  label?: string;
  footer?: ReactNode;
}

export const SettingsModalInput: FC<SettingsModalInputProps> = ({
  label,
  type = 'password',
  placeholder,
  error,
  disabled,
  footer,
  hook,
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
          value={hook.value}
          onChange={(e) => hook.onChange?.(e.target.value)}
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
