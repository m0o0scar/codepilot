import { SettingsButton } from '@components/settings/SettingsButton';

import { ChatBubble } from '../ChatBubble';

export const PleaseProvideAPIKeyMessage = () => (
  <ChatBubble footer={<SettingsButton label="Open settings" />}>
    Please config API keys in settings
  </ChatBubble>
);
