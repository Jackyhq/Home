export class ResponseSizeError extends Error {}

export const readTextBodyWithLimit = async (response: Response, maximumBytes: number) => {
  const declaredLength = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ResponseSizeError(`Response exceeds ${maximumBytes} bytes.`);
  }

  if (!response.body) throw new Error('Response has no readable body.');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new ResponseSizeError(`Response exceeds ${maximumBytes} bytes.`);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  chunks.forEach((chunk) => {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  });

  return new TextDecoder().decode(body);
};
