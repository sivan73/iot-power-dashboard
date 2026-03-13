import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/relay — Dedicated Relay Control Endpoint
 *
 * Sends a single pin update to Blynk Cloud server-side, so:
 *  - BLYNK_TOKEN never leaves the server environment
 *  - Browser CORS restrictions are fully bypassed
 *  - All traffic uses the India/Asia server for lowest latency
 *
 * Query params:
 *   pin   — Virtual pin, e.g. "V0", "V1", …
 *   value — "0" (OFF) or "1" (ON)
 *
 * Example: GET /api/relay?pin=V1&value=1
 */

const BLYNK_BASE = 'https://blr1.blynk.cloud/external/api';

export async function GET(request: NextRequest) {
  const token = process.env.BLYNK_TOKEN;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'BLYNK_TOKEN is not set in server environment.' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const pin   = searchParams.get('pin');
  const value = searchParams.get('value');

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!pin || !/^V\d+$/i.test(pin)) {
    return NextResponse.json(
      { ok: false, error: 'Missing or invalid "pin". Expected format: V0, V1, …' },
      { status: 400 }
    );
  }

  if (value !== '0' && value !== '1') {
    return NextResponse.json(
      { ok: false, error: 'Missing or invalid "value". Must be "0" or "1".' },
      { status: 400 }
    );
  }

  // ── Forward to Blynk ────────────────────────────────────────────────────────
  const blynkUrl = `${BLYNK_BASE}/update?token=${token}&${pin}=${value}`;

  try {
    const blynkRes = await fetch(blynkUrl, { cache: 'no-store' });
    const body     = await blynkRes.text();

    if (!blynkRes.ok) {
      return NextResponse.json(
        { ok: false, error: `Blynk error ${blynkRes.status}`, detail: body },
        { status: blynkRes.status }
      );
    }

    return NextResponse.json({ ok: true, pin, value, blynkResponse: body });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: 'Could not reach Blynk Cloud.', detail: err.message },
      { status: 502 }
    );
  }
}
