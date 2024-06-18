import { ChatBubble } from '../ChatBubble';

export const PleaseProvideAPIKeyMessage = () => (
  <ChatBubble
    footer={
      <span>
        See{' '}
        <a
          className="underline"
          target="_blank"
          href="https://ai.google.dev/gemini-api/docs/api-key"
        >
          [Gemini API] Get an API key
        </a>{' '}
        for more details
      </span>
    }
  >
    Please provide you Google Vertex API key
  </ChatBubble>
);
