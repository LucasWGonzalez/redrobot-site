const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v24.0';
const USER_ID = process.env.INSTAGRAM_USER_ID;
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!USER_ID || !ACCESS_TOKEN) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({ configured: false, posts: [], error: 'Instagram API no configurada' });
  }

  const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
  const url = new URL(`https://graph.facebook.com/${GRAPH_VERSION}/${USER_ID}/media`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '6');
  url.searchParams.set('access_token', ACCESS_TOKEN);

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const data = await response.json();

    if (!response.ok) {
      console.error('Instagram Graph API error', { status: response.status, type: data?.error?.type, code: data?.error?.code });
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).json({ configured: true, posts: [], error: 'No se pudo actualizar Instagram' });
    }

    const posts = (data.data || [])
      .filter((item) => item.permalink && (item.media_url || item.thumbnail_url))
      .slice(0, 3)
      .map(({ id, caption, media_type, media_url, permalink, thumbnail_url, timestamp }) => ({
        id, caption, media_type, media_url, permalink, thumbnail_url, timestamp
      }));

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=21600');
    return res.status(200).json({ configured: true, posts });
  } catch (error) {
    console.error('Instagram feed request failed', error?.message || error);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(502).json({ configured: true, posts: [], error: 'Error de conexión con Instagram' });
  }
}
