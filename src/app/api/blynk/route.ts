import { NextRequest, NextResponse } from 'next/server';

const BLYNK_BASE_URL = 'https://blr1.blynk.cloud/external/api';

/**
 * Vercel Serverless API Route — Blynk Cloud Proxy
 *
 * Proxies all Blynk requests through the server so that:
 *  - The Blynk token never appears in the client-side bundle
 *  - Browser CORS restrictions are fully bypassed
 *  - The India/Asia server (blr1.blynk.cloud) is used for lowest latency
 *
 * Query params expected from the client:
 *   action  — "get" | "update"
 *   pin     — e.g. "V0", "V1", …  (one or more, repeated for bulk get)
 *   value   — "0" | "1"           (only required for action=update)
 */
export async function GET(request: NextRequest) {
  const token = process.env.BLYNK_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: 'BLYNK_TOKEN is not configured on the server.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action'); // "get" or "update"

  if (!action || (action !== 'get' && action !== 'update')) {
    return NextResponse.json(
      { error: 'Invalid or missing "action" query param. Use "get" or "update".' },
      { status: 400 }
    );
  }

  // Build the upstream Blynk URL
  let blynkUrl: string;

  if (action === 'update') {
    const pin = searchParams.get('pin');
    const value = searchParams.get('value');
    if (!pin || value === null) {
      return NextResponse.json(
        { error: 'Missing "pin" or "value" for action=update.' },
        { status: 400 }
      );
    }
    blynkUrl = `${BLYNK_BASE_URL}/update?token=${token}&${pin}=${value}`;
  } else {
    // action === 'get' — supports multiple pins via repeated "pin" params
    const pins = searchParams.getAll('pin');
    if (pins.length === 0) {
      return NextResponse.json(
        { error: 'Missing "pin" for action=get.' },
        { status: 400 }
      );
    }
    const pinQuery = pins.join('&');
    blynkUrl = `${BLYNK_BASE_URL}/get?token=${token}&${pinQuery}`;
  }

  try {
    const blynkResponse = await fetch(blynkUrl, {
      // Server-side fetch — no CORS restrictions apply
      cache: 'no-store',
    });

    const text = await blynkResponse.text();

    if (!blynkResponse.ok) {
      return NextResponse.json(
        { error: `Blynk error: ${blynkResponse.status}`, detail: text },
        { status: blynkResponse.status }
      );
    }

    // Try to parse as JSON (bulk get returns JSON), fall back to plain text
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: 200 });
    } catch {
      return new NextResponse(text, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Failed to reach Blynk Cloud.', detail: err.message },
      { status: 502 }
    );
  }
}
