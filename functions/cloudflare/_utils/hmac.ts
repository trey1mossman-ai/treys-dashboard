// HMAC signing for n8n webhook security
export async function createHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifyHmacSignature(
  secret: string,
  payload: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createHmacSignature(secret, payload);
  return expectedSignature === signature;
}