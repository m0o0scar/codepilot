import cls from 'classnames';
import { FC, useState } from 'react';

export interface MessageInputProps {
  placeholder?: string;
  disabled?: boolean;
  onEnter?: (message: string) => void;
}

export const MessageInput: FC<MessageInputProps> = ({ placeholder, disabled, onEnter }) => {
  const [value, setValue] = useState('');

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const trimmed = value.trim();
    if (e.key === 'Enter' && trimmed) {
      onEnter?.(trimmed);
      setValue('');
    }
  };

  return (
    <div
      className={cls(
        'fixed left-0 right-0 bottom-0 flex flex-row gap-2 p-2 border-t border-t-base-300',
        disabled ? 'bg-base-200' : 'bg-base-100',
      )}
    >
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
        {value && (
          <button className="btn btn-xs btn-circle" onClick={() => setValue('')}>
            ⛌
          </button>
        )}
        <kbd className="kbd kbd-sm">↵</kbd>
      </label>
    </div>
  );
};
