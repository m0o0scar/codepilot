import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: NextRequest) {
  const url = new URL(request.url);
  const dest = decodeURIComponent(url.searchParams.get('dest') || '');

  if (!dest) return new Response('dest url is required', { status: 400 });

  return fetch(dest);
}
