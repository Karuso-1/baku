// Pequeño servidor de Baku: solo hace de puente con el buscador de Open Food Facts,
// que no deja buscar directamente desde el navegador. El resto son archivos estáticos.
const FIELDS = 'code,product_name,product_name_es,brands,nutriments,categories_tags,serving_quantity,quantity,allergens_tags,traces_tags,ingredients_analysis_tags';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/buscar') {
      const q = (url.searchParams.get('q') || '').slice(0, 80);
      if (q.length < 2) return Response.json({ products: [] });
      const off = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&lc=es&cc=es&fields=${FIELDS}`;
      const res = await fetch(off, { headers: { 'User-Agent': 'Baku/1.0 (app personal de dieta)' }, cf: { cacheTtl: 3600 } });
      return new Response(res.body, {
        status: res.status,
        headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=3600' },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
