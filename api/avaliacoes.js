/* Avaliações do Google da Portella (função da Vercel em /api/avaliacoes).
   Busca na API do Google Places (New) a nota, o total e as avaliações mais relevantes
   (a API devolve no máximo 5). A chave fica na variável de ambiente GOOGLE_PLACES_API_KEY
   da Vercel; GOOGLE_PLACE_ID é opcional (sem ela, a função localiza a Portella pelo nome).
   A resposta fica 1 dia no cache da Vercel, então avaliações novas aparecem em até 24 h. */

var BUSCA = 'Portella Corretora de Seguros em Osasco';
var CAMPOS = ['id', 'rating', 'userRatingCount', 'googleMapsUri', 'reviews'];

module.exports = async function (req, res) {
  var key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return responder(res, 503, { erro: 'GOOGLE_PLACES_API_KEY não configurada' }, 'no-store');

  try {
    var headers = { 'X-Goog-Api-Key': key, 'Content-Type': 'application/json' };
    var lugar;
    if (process.env.GOOGLE_PLACE_ID) {
      headers['X-Goog-FieldMask'] = CAMPOS.join(',');
      var r = await fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(process.env.GOOGLE_PLACE_ID) + '?languageCode=pt-BR', { headers: headers });
      if (!r.ok) throw new Error('Places ' + r.status + ': ' + (await r.text()));
      lugar = await r.json();
    } else {
      headers['X-Goog-FieldMask'] = CAMPOS.map(function (c) { return 'places.' + c; }).join(',');
      var s = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          textQuery: BUSCA,
          languageCode: 'pt-BR',
          locationBias: { circle: { center: { latitude: -23.5441, longitude: -46.7666 }, radius: 3000 } }
        })
      });
      if (!s.ok) throw new Error('Places ' + s.status + ': ' + (await s.text()));
      lugar = ((await s.json()).places || [])[0];
      if (!lugar) throw new Error('Portella não encontrada na busca do Google');
    }

    var avaliacoes = (lugar.reviews || [])
      .filter(function (a) { return a.text && a.text.text; })
      .map(function (a) {
        var autor = a.authorAttribution || {};
        return {
          nome: autor.displayName || 'Cliente Google',
          perfil: autor.uri || '',
          foto: autor.photoUri || '',
          nota: a.rating || 0,
          texto: (a.originalText || a.text).text,
          quando: a.relativePublishTimeDescription || '',
          link: a.googleMapsUri || ''
        };
      });

    responder(res, 200, {
      nota: lugar.rating || null,
      total: lugar.userRatingCount || 0,
      link: lugar.googleMapsUri || '',
      avaliacoes: avaliacoes
    }, 's-maxage=86400, stale-while-revalidate=86400');
  } catch (e) {
    console.error(e);
    responder(res, 502, { erro: 'Falha ao consultar o Google' }, 'no-store');
  }
};

function responder(res, status, corpo, cache) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.end(JSON.stringify(corpo));
}
