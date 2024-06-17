export const fetchWithProgress = async (
  url: string,
  onProgress?: (loaded: number, total: number) => void,
) => {
  // Step 1: start the fetch and obtain a reader
  const response = await fetch(url);
  const reader = response.body!.getReader();

  // Step 2: get total length
  const contentLength = parseInt(response.headers.get('Content-Length') || '') || 0;

  // Step 3: read the data
  let receivedLength = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();

    if (value) {
      chunks.push(value);
      receivedLength += value.length;
    }

    onProgress?.(receivedLength, contentLength);

    if (done) break;
  }

  // Step 4: concatenate chunks into single Uint8Array
  const allChunks = new Uint8Array(receivedLength);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  // return as blob
  return new Blob([allChunks]);
};
