"use server"

export async function incrementAttempt() {
    const apiKey = process.env.ADMIN_API_KEY;

    if (!apiKey) {
        throw new Error('Missing server-side API key');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/incrementAttempt`, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
    });

    if (!response.ok) {
        throw new Error(`Error incrementing attempt count: ${response.statusText}`);
    }

    return response.json();
}
