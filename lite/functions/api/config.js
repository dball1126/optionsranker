const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function structuredLog(fn, data) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), fn, ...data }));
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const config = {
    googleClientId: context.env.GOOGLE_CLIENT_ID || null,
  };

  structuredLog('config', { status: 200 });

  return Response.json(config, {
    headers: {
      ...CORS,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
