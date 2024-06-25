import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow as style } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'react-toastify';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

import { downloadTextFile, languageToFileExt } from '@utils/file';

export const Markdown: FC<{ content?: string }> = ({ content }) => {
  if (!content) return null;

  return (
    <ReactMarkdown
      // eslint-disable-next-line react/no-children-prop
      children={content}
      className="prose prose-sm max-w-full"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeExternalLinks, { target: '_blank' }]]}
      components={{
        code(props) {
          const { children, className, node, ref, ...rest } = props;
          const match = /language-(\w+)/.exec(className || '');
          const language = match?.[1];

          if (language && language !== 'mermaid') {
            const code = String(children).replace(/\n$/, '').trim();
            return (
              <div className="relative not-prose text-xs mx-[-12px] my-[-14px]">
                <SyntaxHighlighter
                  {...rest}
                  // eslint-disable-next-line react/no-children-prop
                  children={code}
                  language={language}
                  style={style}
                  wrapLongLines
                />

                <div className="absolute right-2 bottom-2 flex flex-row gap-1">
                  <button
                    className="btn btn-sm btn-square bg-opacity-45 border-none"
                    onClick={() =>
                      downloadTextFile(code, 'text/plain', `code.${languageToFileExt(language)}`)
                    }
                  >
                    ⬇️
                  </button>
                  <button
                    className="btn btn-sm btn-square bg-opacity-45 border-none"
                    onClick={() =>
                      navigator.clipboard.writeText(code).then(() => toast('Code copied!'))
                    }
                  >
                    📋
                  </button>
                </div>
              </div>
            );
          }

          return (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};
