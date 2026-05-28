// Netlify Function: CORS-Proxy für iCal-Feeds
// Aufruf: /.netlify/functions/ical?url=airbnb  oder  ?url=hvb

const FEEDS = {
  airbnb: 'https://www.airbnb.de/calendar/ical/7077736.ics?s=7d14ab54d5791bc63577c08afa43bc1f',
  hvb:    'https://www.optimale-praesentation.de/comm/ical/e8043_4a44d8be/belegungen.ics'
};

exports.handler = async function(event) {
  const key = (event.queryStringParameters || {}).url;
  const feedUrl = FEEDS[key];

  if (!feedUrl) {
    return {
      statusCode: 400,
      body: 'Unknown feed key. Use ?url=airbnb or ?url=hvb'
    };
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'fewo-seesternchen.de/calendar-proxy' }
    });

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }

    const text = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900'   // 15 min cachen
      },
      body: text
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: `Could not fetch calendar: ${err.message}`
    };
  }
};
