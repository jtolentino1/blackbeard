// app/chat/actions.ts
'use server';

export async function getMessages() {
  const apiKey = process.env.ADMIN_API_KEY;

  if (!apiKey) {
    throw new Error('Missing server-side API key');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/messages/recent`, {
    method: 'GET',
    headers: { 'x-api-key': apiKey },
    cache: 'no-store', 
  });

  if (!response.ok) {
    throw new Error(`Error fetching messages: ${response.statusText}`);
  }

  return response.json();
}
