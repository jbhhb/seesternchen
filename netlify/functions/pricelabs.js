// PriceLabs Proxy – POST /v1/listing_prices
// Benötigte Env Vars in Netlify Dashboard:
//   PRICELABS_API_KEY    → dein PriceLabs API Key
//   PRICELABS_LISTING_ID → z.B. 7077736
//   PRICELABS_PMS        → Plattform-Kürzel, z.B. "airbnb" (Default: airbnb)

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey    = process.env.PRICELABS_API_KEY;
  const listingId = process.env.PRICELABS_LISTING_ID;
  const pms       = process.env.PRICELABS_PMS || 'airbnb';

  if (!apiKey || !listingId) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'PRICELABS_API_KEY oder PRICELABS_LISTING_ID fehlt' }),
    };
  }

  const dateFrom = toISODate(new Date());
  const dateTo   = toISODate(daysFromNow(90));

  const payload = [
    { id: listingId, pms, dateFrom, dateTo, reason: false }
  ];

  try {
    const resp = await fetch('https://api.pricelabs.co/v1/listing_prices', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();

    if (!resp.ok) {
      console.error('PriceLabs error', resp.status, text);
      return {
        statusCode: resp.status,
        headers: corsHeaders(),
        body: JSON.stringify({ error: `PriceLabs ${resp.status}`, details: text }),
      };
    }

    // Wir parsen + re-serialisieren um nur was der Client braucht rauszugeben
    const raw = JSON.parse(text);
    const days = extractDays(raw);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 1h cachen
      },
      body: JSON.stringify({ days }),
    };

  } catch (err) {
    console.error('Fetch error', err);
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: err.message }),
    };
  }
};

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

// Normalisiert die PriceLabs-Antwort auf einfaches Array:
// [{ date: 'YYYY-MM-DD', price: 58, available: true }]
function extractDays(raw) {
  // Antwort: Array von Listings → wir nehmen immer das erste
  const listing = Array.isArray(raw) ? raw[0] : raw;
  const prices  = listing?.prices ?? listing?.data ?? [];

  return prices.map(d => ({
    date:      d.date,
    price:     d.price ?? null,
    available: !d.unbookable && d.booking_status !== 'booked' && d.booking_status !== 'blocked',
  }));
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  'https://fewo-seesternchen.de',
    'Access-Control-Allow-Methods': 'GET',
  };
}

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
