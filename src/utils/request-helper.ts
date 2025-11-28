export async function serializeRequestBody(body: any) {
  if (!body) return null;

  if (typeof body === 'string') {
    return { type: 'text', value: body };
  }

  if (body instanceof Blob) {
    const text = await body.text().catch(() => "BLOB_DATA");
    return { type: 'blob', value: text };
  }

  if (body instanceof FormData) {
    const obj = {};
    body.forEach((v, k) => { obj[k] = v; });
    return { type: 'form-data', value: obj };
  }

  if (body instanceof URLSearchParams) {
    return { type: 'url-params', value: body.toString() };
  }

  if (body instanceof ArrayBuffer) {
    return { type: 'array-buffer', value: Array.from(new Uint8Array(body)) };
  }

  if (typeof body === 'object') {
    try {
      return {
        type: 'json',
        value: JSON.stringify(body)
      };
    } catch { }
  }

  return { type: 'unknown', value: String(body) };
}