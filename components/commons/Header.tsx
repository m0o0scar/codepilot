import Head from 'next/head';
import { FC } from 'react';

export interface HeaderProps {
  title?: string;
  emoji?: string;
}

export const Header: FC<HeaderProps> = ({ title, emoji }) => {
  return (
    <Head>
      {title && <title>{title}</title>}
      {/* <meta name="description" content="Bla bla bla" /> */}
      <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no" />
      {/* <link rel="icon" href="/favicon.png" /> */}
      {/* <link rel="apple-touch-icon" href="/favicon.jpeg" /> */}
      {emoji && (
        <link
          rel="icon"
          href={`data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${emoji}</text></svg>`}
        ></link>
      )}
    </Head>
  );
};
