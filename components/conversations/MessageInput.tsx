import { FC, useState } from 'react';

export interface MessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  onEnter?: (message: string) => void;
}

export const MessageInput: FC<MessageInputProps> = ({ placeholder, disabled, onEnter }) => {
  const [value, setValue] = useState('');

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onEnter?.(value.trim());
      setValue('');
    }
  };

  return (
    <div className="fixed left-0 right-0 bottom-0 flex flex-row gap-2 p-2 bg-base-100">
      <label className="input flex items-center gap-2 grow">
        <input
          type="text"
          className="grow"
          placeholder={placeholder || 'Type here'}
          disabled={disabled}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <kbd className="kbd kbd-sm">↵</kbd>
      </label>
    </div>
  );
};
