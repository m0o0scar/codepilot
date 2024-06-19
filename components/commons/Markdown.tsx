import { FC } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow as style } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGfm from 'remark-gfm';

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
          return match && match[1] !== 'mermaid' ? (
            <div className="not-prose text-xs mx-[-12px] my-[-14px]">
              <SyntaxHighlighter
                {...rest}
                // eslint-disable-next-line react/no-children-prop
                children={String(children).replace(/\n$/, '').trim()}
                language={match[1]}
                style={style}
                wrapLongLines
              />
            </div>
          ) : (
            <code {...rest} className={className}>
              {children}
            </code>
          );
        },
      }}
    />
  );
};
