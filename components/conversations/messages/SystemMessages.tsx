import { FC } from 'react';

import { SystemNote } from '../useChat';

export const SystemMessage: FC<{ message: SystemNote }> = ({ message }) => {
  return (
    <div
      role="alert"
      className="alert alert-warning text-sm my-1 mx-3 w-auto"
      style={{ wordBreak: 'break-word' }}
    >
      ❗️ {message.content}
    </div>
  );
};
