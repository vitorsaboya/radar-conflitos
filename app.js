/* Radar de Conflitos Sociais — protótipo de apresentação.
   Dados públicos gerados por gerar_dados.py; tudo roda no navegador, sem servidor. */
(function () {
'use strict';

// ------------------------------------------------------------------ estado
const S = {
  D: null, geo: null, ferro: null, tis: null,
  modo: 'apresentacao', passo: 0,
  indice: 'nenhum',
  camadas: { ocor: false, bloq: false, ferro: false, barr: false, tis: false },
  anoIni: 2020, anoFim: 2025, ilegal: false,
  sel: null, marcadores: [],
};
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => Number(n).toLocaleString('pt-BR');
const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const dataBR = (iso) => (iso && iso.length >= 10 ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : iso || '');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesAno = (iso) => MESES[+iso.slice(5, 7) - 1] + '/' + iso.slice(0, 4);

// ------------------------------------------------------------------ índices e cores
const INDICES = {
  nenhum: { nome: 'Nenhum', desc: 'Só o desenho dos municípios.' },
  ocor: {
    nome: 'Ocorrências no período', cortes: [1, 3, 10, 30, 80],
    cores: ['#F1E2D0', '#E6C09E', '#D8916A', '#C0603F', '#8C2F1E'],
    rot: ['1', '3', '10', '30', '80+'], desc: 'Fatos registrados pelo Observatório no período escolhido.',
  },
  regua: {
    nome: 'Régua: onde o radar acende', cat: true,
    cores: { 2: '#B4462F', 1: '#E9C3A0' }, rot: [['#B4462F', 'Conflito nos últimos 12 meses'], ['#E9C3A0', 'Conflito 12 a 24 meses atrás']],
    desc: 'Lente A em versão mínima: repetir o passado.',
  },
  barr: {
    nome: 'Barragens de mineração', cortes: [1, 3, 8, 15],
    cores: ['#D3E6E4', '#97C4C1', '#4F9898', '#1D6767'], rot: ['1', '3', '8', '15+'], desc: 'Barragens no cadastro da ANM (SIGBM).',
  },
  kmf: {
    nome: 'Quilômetros de ferrovia', cortes: [1, 20, 50, 100],
    cores: ['#DDE1E4', '#B1BAC1', '#7B8893', '#3F4C56'], rot: ['1', '20', '50', '100+'], desc: 'Trilho que cruza o município (DNIT).',
  },
};
const CAMADAS = {
  ocor: { nome: 'Ocorrências (Observatório)', cor: '#B4462F', forma: '' },
  bloq: { nome: 'Bloqueios de ativo e rodovia', cor: '#C98316', forma: '' },
  ferro: { nome: 'Ferrovias', cor: '#2F3B44', forma: 'linha' },
  barr: { nome: 'Barragens de mineração', cor: '#0E5A61', forma: '' },
  tis: { nome: 'Terras indígenas', cor: '#557F45', forma: 'area' },
};

function ocorrenciasFiltradas(extra) {
  return S.D.ocorrencias.filter((o) => {
    const a = +o.d.slice(0, 4);
    if (a < S.anoIni || a > S.anoFim) return false;
    if (o.il && !S.ilegal) return false;
    return !extra || extra(o);
  });
}

function valorIndice(cod, contagem) {
  const m = S.D.municipios[cod];
  if (S.indice === 'ocor') return contagem[cod] || 0;
  if (S.indice === 'regua') return m.regua;
  if (S.indice === 'barr') return m.barr;
  if (S.indice === 'kmf') return m.kmf;
  return 0;
}

function corDe(v) {
  const ix = INDICES[S.indice];
  if (!ix || S.indice === 'nenhum') return 'rgba(222,214,200,0.55)';
  if (!v) return 'rgba(0,0,0,0)';
  if (ix.cat) return ix.cores[v] || 'rgba(0,0,0,0)';
  let c = null;
  ix.cortes.forEach((k, i) => { if (v >= k) c = ix.cores[i]; });
  return c || 'rgba(0,0,0,0)';
}

// ------------------------------------------------------------------ mapa
let map;
const BBOX_TUDO = [[-59.2, -23.2], [-39.7, 2.8]];

function criarMapa() {
  map = new maplibregl.Map({
    container: 'mapa',
    style: {
      version: 8,
      sources: {
        base: { type: 'raster', tileSize: 256, maxzoom: 16, attribution: 'Fundo: Esri, HERE, Garmin, © OpenStreetMap',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'] },
        nomes: { type: 'raster', tileSize: 256, maxzoom: 16,
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'] },
      },
      layers: [
        { id: 'fundo', type: 'background', paint: { 'background-color': '#EEF0EC' } },
        { id: 'base', type: 'raster', source: 'base', paint: { 'raster-opacity': 0.95, 'raster-saturation': -0.35 } },
      ],
    },
    bounds: BBOX_TUDO, fitBoundsOptions: { padding: 20 },
    maxBounds: [[-80, -38], [-25, 10]], minZoom: 3, maxZoom: 13,
    attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, touchPitch: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
}

function montarCamadas() {
  map.addSource('munis', { type: 'geojson', data: S.geo, promoteId: 'cod' });
  map.addLayer({ id: 'munis-fill', type: 'fill', source: 'munis',
    paint: { 'fill-color': ['to-color', ['coalesce', ['feature-state', 'cor'], 'rgba(0,0,0,0)']], 'fill-opacity': 0.82 } });
  map.addLayer({ id: 'munis-linha', type: 'line', source: 'munis',
    paint: { 'line-color': '#8A8478', 'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.18, 8, 0.45], 'line-width': 0.5 } });

  map.addSource('tis', { type: 'geojson', data: S.tis });
  map.addLayer({ id: 'tis-fill', type: 'fill', source: 'tis', layout: { visibility: 'none' }, paint: { 'fill-color': '#557F45', 'fill-opacity': 0.2 } });
  map.addLayer({ id: 'tis-linha', type: 'line', source: 'tis', layout: { visibility: 'none' }, paint: { 'line-color': '#476C39', 'line-width': 1 } });

  map.addLayer({ id: 'nomes', type: 'raster', source: 'nomes', paint: { 'raster-opacity': 0.85 } });

  map.addSource('ferro', { type: 'geojson', data: S.ferro });
  map.addLayer({ id: 'ferro', type: 'line', source: 'ferro', layout: { visibility: 'none', 'line-cap': 'round' },
    paint: { 'line-color': '#2F3B44', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.2, 9, 2.6] } });

  map.addSource('sel', { type: 'geojson', data: vazio() });
  map.addLayer({ id: 'sel-linha', type: 'line', source: 'sel', paint: { 'line-color': '#1C2226', 'line-width': 2.4 } });

  map.addSource('barr', { type: 'geojson', data: pontos(S.D.barragens, 'barr') });
  map.addLayer({ id: 'barr', type: 'circle', source: 'barr', layout: { visibility: 'none' },
    paint: { 'circle-color': '#10282C', 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.6, 10, 6],
      'circle-stroke-color': '#fff', 'circle-stroke-width': 1.4 } });

  map.addSource('ocor', { type: 'geojson', data: vazio() });
  map.addLayer({ id: 'ocor', type: 'circle', source: 'ocor', layout: { visibility: 'none' },
    paint: { 'circle-color': '#B4462F', 'circle-opacity': 0.62, 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 2.6, 10, 6.5],
      'circle-stroke-color': '#fff', 'circle-stroke-width': 0.8 } });

  map.addSource('bloq', { type: 'geojson', data: pontos(S.D.bloqueios.filter((b) => b.x != null), 'bloq') });
  map.addLayer({ id: 'bloq', type: 'circle', source: 'bloq', layout: { visibility: 'none' },
    paint: { 'circle-color': ['case', ['==', ['get', 'tipo'], 'M'], '#C98316', '#FFFFFF'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4.5, 10, 9],
      'circle-stroke-color': '#7A4E0A', 'circle-stroke-width': ['case', ['==', ['get', 'tipo'], 'M'], 1.2, 2.2] } });

  const clicaveis = ['bloq', 'ocor', 'barr', 'tis-fill'];
  map.on('click', (e) => {
    if (celular() && document.body.classList.contains('folha-aberta')) { fecharFolhas(); return; }
    const r = 8, p = e.point;
    const caixa = [[p.x - r, p.y - r], [p.x + r, p.y + r]];
    const f = map.queryRenderedFeatures(caixa, { layers: clicaveis.filter((l) => map.getLayer(l) && map.getLayoutProperty(l, 'visibility') !== 'none') });
    if (f.length) { abrirFichaPonto(f[0]); return; }
    const m = map.queryRenderedFeatures(p, { layers: ['munis-fill'] });
    if (m.length) abrirFichaMunicipio(String(m[0].properties.cod));
  });
  map.on('mousemove', (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers: ['munis-fill', ...clicaveis].filter((l) => map.getLayoutProperty(l, 'visibility') !== 'none') });
    map.getCanvas().style.cursor = f.length ? 'pointer' : '';
  });
}

const vazio = () => ({ type: 'FeatureCollection', features: [] });
function pontos(lista, tipo) {
  return { type: 'FeatureCollection', features: lista.map((o, i) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [o.x, o.y] },
    properties: { tipo: tipo === 'bloq' ? o.id[0] : tipo, i: tipo === 'ocor' ? o.id : i, id: o.id || '' } })) };
}

function aplicarMapa() {
  if (!map || !map.getSource('munis')) return;
  const lista = ocorrenciasFiltradas();
  const contagem = {};
  lista.forEach((o) => { contagem[o.m] = (contagem[o.m] || 0) + 1; });
  Object.keys(S.D.municipios).forEach((cod) => {
    map.setFeatureState({ source: 'munis', id: cod }, { cor: corDe(valorIndice(cod, contagem)) });
  });
  map.getSource('ocor').setData(pontos(lista, 'ocor'));
  const vis = (id, on) => map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  vis('ocor', S.camadas.ocor); vis('bloq', S.camadas.bloq); vis('ferro', S.camadas.ferro);
  vis('barr', S.camadas.barr); vis('tis-fill', S.camadas.tis); vis('tis-linha', S.camadas.tis);
  const geoSel = S.sel ? S.geo.features.filter((f) => f.properties.cod === S.sel) : [];
  map.getSource('sel').setData({ type: 'FeatureCollection', features: geoSel });
  desenharControles(contagem, lista.length);
}

function folga() {
  // espaço ocupado pelos painéis, para enquadrar o mapa na parte visível
  const pad = { top: 70, left: 30, right: 30, bottom: 30 };
  const painel = S.modo === 'apresentacao' ? $('#historia') : null;
  if (painel) {
    const r = painel.getBoundingClientRect();
    if (r.width >= window.innerWidth - 4) pad.bottom = window.innerHeight - r.top + 20;
    else pad.left = r.right + 30;
  } else if (!celular()) {
    const c = $('#controles').getBoundingClientRect();
    if (c.width) pad.left = c.right + 24;
    const g = $('#gaveta').getBoundingClientRect();
    if (g.width) pad.right = window.innerWidth - g.left + 24;
  } else {
    pad.bottom = 90;
  }
  return pad;
}

function enquadrar(bbox, maxZoom) {
  map.fitBounds(bbox, { padding: folga(), maxZoom: maxZoom || 11, duration: 1600, essential: true });
}

function limparMarcadores() { S.marcadores.forEach((m) => m.remove()); S.marcadores = []; }
function marcar(x, y, texto, classe) {
  const el = document.createElement('div');
  el.className = 'rotulo-mapa ' + (classe || '');
  el.innerHTML = '<i></i>' + (texto ? '<span>' + esc(texto) + '</span>' : '');
  const m = new maplibregl.Marker({ element: el, anchor: 'left', offset: [-7, 0] }).setLngLat([x, y]).addTo(map);
  S.marcadores.push(m);
}

// ------------------------------------------------------------------ apresentação
function contagemAnos() {
  const c = {};
  S.D.ocorrencias.forEach((o) => { if (!o.il) c[o.d.slice(0, 4)] = (c[o.d.slice(0, 4)] || 0) + 1; });
  return c;
}
function topMunicipios(n) {
  return Object.entries(S.D.municipios).filter(([, v]) => v.n).sort((a, b) => b[1].n - a[1].n).slice(0, n);
}
function topEmpresas(n) {
  const c = {};
  S.D.ocorrencias.forEach((o) => { if (!o.il && o.e && o.e !== 'Não informado') c[o.e] = (c[o.e] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n);
}
function barrasAnos(c, parcial) {
  const max = Math.max(...Object.values(c));
  return '<div class="barras">' + Object.keys(c).sort().map((a) =>
    `<div class="b ${a === parcial ? 'parcial' : ''}"><em>${fmt(c[a])}</em><i style="height:${Math.max(2, (78 * c[a]) / max)}%"></i>${a}</div>`).join('') + '</div>';
}
function lentesHTML(ativa) {
  const L = [['A', 'Conflito local', 'onde a tensão deve aparecer nos próximos meses'], ['B', 'Controvérsia', 'o caso público de uma empresa está crescendo?'],
    ['C', 'Pauta organizada', 'quem se mobiliza, com que pauta e quando'], ['D', 'Impacto cruzado', 'pauta de fora que para um ativo da mineração']];
  return '<div class="lentes">' + L.map(([k, n, d]) => `<div class="lente ${k === ativa ? 'ativa' : ''}"><b>Lente ${k} · ${n}</b>${d}</div>`).join('') + '</div>';
}
function perguntaBotao(q) { return `<button type="button" class="link-pergunta" data-pergunta="${esc(q)}">Pergunte sobre isto</button>`; }

function passos() {
  const R = S.D.resumo, M = S.D.municipios;
  const b = (id) => S.D.bloqueios.find((x) => x.id === id) || {};
  const caso = S.D.ocorrencias.find((o) => o.n.includes('Turiwara') && o.r.includes('Ocupação')) || S.D.ocorrencias[0];
  const anos = contagemAnos();
  const top = topMunicipios(10);
  const top10 = top.reduce((s, [, v]) => s + v.n, 0);
  const emp = topEmpresas(6);
  const fv = R.fontes_veredicto;
  const pegaFv = (k) => Object.entries(fv).filter(([n]) => n.startsWith(k)).reduce((s, [, v]) => s + v, 0);
  const vered = [['Pronta', pegaFv('Pronta') - pegaFv('Pronta com'), '#1D6767'], ['Pronta com ressalva', pegaFv('Pronta com'), '#7FB3B0'],
    ['Só referência', pegaFv('Só'), '#C9C2B6'], ['Fora por decisão', pegaFv('Fora por'), '#E2B07A'], ['Fora de alcance', pegaFv('Fora de'), '#C98316'],
    ['Indisponível', pegaFv('Indis'), '#B4462F'], ['Descartada', pegaFv('Desc'), '#6E6E6E']];
  const regua = R.regua;
  const mOrg = (S.D.organizacoes || []).slice(0, 8);
  const agenda = (S.D.agenda || []).slice(0, 3);
  const b2 = b('M02'), b3 = b('M03');
  const cap = (t) => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);
  const maeMaria = S.D.bloqueios.filter((x) => /m[aã]e maria/i.test(x.quem + ' ' + x.lugar)).length;

  return [
    { // 1
      sobre: 'Radar de Conflitos Sociais', capa: true,
      titulo: 'Onde a mineração e a sociedade entram em atrito?',
      html: `<p class="destaque">Mineração mexe com terra, água, estrada e emprego. Quando essa relação azeda, deixa rastro: um protesto, uma carta pública, uma ação na Justiça, uma ferrovia parada.</p>
        <p>O radar junta esses rastros, só com <b>dado público</b>, para mostrar onde a tensão está, o que pesou e de onde veio cada informação.</p>
        <p class="pequeno">Recorte do protótipo: Minas Gerais e Pará, ${fmt(Object.keys(M).length)} municípios.</p>
        <div class="acoes"><button type="button" class="btn-pri" data-ir="1">Começar a apresentação</button><button type="button" class="btn-sec" data-modo-ir="explorar">Ir direto ao mapa</button></div>`,
      mapa: { bbox: BBOX_TUDO, indice: 'nenhum', camadas: [] },
    },
    { // 2
      sobre: 'O conceito', titulo: 'O que conta como conflito',
      html: `<p>Toda tensão que <b>vira fato</b> entre a mineração (minas, barragens, ferrovias, estradas) e a sociedade (comunidades e movimentos organizados).</p>
        <p>O motivo pode ser do próprio empreendimento ou vir de fora e só usar o empreendimento como alavanca.</p>
        <div class="exemplo local"><b>Pauta local · ${esc(b2.d || '')}</b>${esc(cap(b2.quem))} param a ${esc(b2.ativo || '')} em ${esc(b2.lugar || '')}. Pauta: ${esc(b2.pauta || '')}.</div>
        <div class="exemplo fora"><b>Pauta de fora · ${esc(b3.d || '')}</b>${esc(cap(b3.quem))} param a ${esc(b3.ativo || '')} em ${esc(b3.lugar || '')}. Pauta: ${esc((b3.pauta || '').split(';')[0])}. A pauta era com o governo federal; a ferrovia virou alavanca.</div>
        <p class="pequeno">EFC = Estrada de Ferro Carajás. Fontes: links na ficha de cada ponto.</p>${perguntaBotao('O que é impacto cruzado?')}`,
      mapa: { bbox: [[-50.4, -6.2], [-47.9, -4.4]], indice: 'nenhum', camadas: ['ferro', 'tis'],
        marcas: [[b2, 'Pauta local', 'petroleo'], [b3, 'Pauta de fora', 'ocre']] },
    },
    { // 3
      sobre: 'A matéria-prima', titulo: 'Cada fato vira uma ficha',
      html: `<p>Notícia, nota de movimento, processo: tudo vira o mesmo registro, a <b>materialização</b>. Um exemplo real:</p>
        <table class="anatomia">
          <tr><th>Quando</th><td>${dataBR(caso.d)}</td></tr>
          <tr><th>Onde</th><td>${esc(M[caso.m].nome)} (${M[caso.m].uf})</td></tr>
          <tr><th>Quem</th><td>${esc(caso.a)}</td></tr>
          <tr><th>Contra o quê</th><td>${esc(caso.o)} de ${esc(caso.mi.toLowerCase())} · ${esc(caso.e)}</td></tr>
          <tr><th>Pauta</th><td>${esc(caso.t)}</td></tr>
          <tr><th>Forma</th><td>${esc(caso.r)}</td></tr>
          <tr><th>Fonte</th><td>${linksHTML(caso.l, 1)}</td></tr>
        </table>
        <p>Com a ficha padronizada, dá para contar, comparar, cruzar com o território e, principalmente, <b>voltar à fonte</b> com um clique.</p>${perguntaBotao('Como os dados são organizados?')}`,
      mapa: { bbox: [[caso.x - 0.6, caso.y - 0.45], [caso.x + 0.6, caso.y + 0.45]], indice: 'nenhum', camadas: ['ocor', 'tis'],
        marcas: [[caso, M[caso.m].nome, 'pulso']] },
    },
    { // 4
      sobre: 'A base comum', titulo: `${fmt(R.escopo)} fatos em quase seis anos`,
      html: `<p>O <b>Observatório dos Conflitos da Mineração</b> registrou ${fmt(R.ocorrencias_total_mg_pa)} ocorrências em MG e PA de ${mesAno(R.primeira)} a ${mesAno(R.ultima)}.</p>
        <p>Tirando garimpo e mineração ilegal (fora do escopo por ora) e ${R.sem_data} registros sem data, ficam <b>${fmt(R.escopo)}</b>.</p>
        <div class="numeros"><div class="numero terra"><b>${fmt(R.escopo_mg)}</b><span>em Minas Gerais</span></div><div class="numero terra"><b>${fmt(R.escopo_pa)}</b><span>no Pará</span></div></div>
        ${barrasAnos(anos, R.ultima.slice(0, 4))}
        <p class="pequeno">${R.ultima.slice(0, 4)} está incompleto: o Observatório cadastra em lotes, com atraso.</p>`,
      mapa: { bbox: BBOX_TUDO, indice: 'nenhum', camadas: ['ocor'] },
    },
    { // 5
      sobre: 'Onde se concentra', titulo: `10 municípios somam ${pct(top10, R.escopo)}% dos fatos`,
      html: `<p>A tensão não é espalhada. Ela se concentra onde a mineração é antiga e grande: o Quadrilátero Ferrífero em Minas, Barcarena e o Xingu no Pará.</p>
        <ol class="ranking">${top.map(([, v]) => `<li><span>${esc(v.nome)}<span class="uf">${v.uf}</span></span><span>${fmt(v.n)}</span></li>`).join('')}</ol>
        <p class="pequeno">Brumadinho lidera pelo rastro do rompimento de 2019, que segue gerando conflito anos depois.</p>${perguntaBotao('Como está Brumadinho?')}`,
      mapa: { bbox: BBOX_TUDO, indice: 'ocor', camadas: [], marcas: ['Brumadinho', 'Itabira', 'Barcarena', 'Senador José Porfírio'].map((n) => Object.values(M).find((v) => v.nome === n)).filter(Boolean).map((v) => [{ x: v.cx, y: v.cy }, v.nome]) },
    },
    { // 6
      sobre: 'O território exposto', titulo: 'Onde há estrutura, há atrito',
      html: `<p>O mapa do conflito se sobrepõe ao mapa da estrutura. Nos dois estados há:</p>
        <div class="numeros"><div class="numero petroleo"><b>${fmt(R.barragens)}</b><span>barragens de mineração (ANM)</span></div><div class="numero"><b>${fmt(R.ferrovia_km)} km</b><span>de ferrovia (DNIT)</span></div></div>
        <p>No Quadrilátero Ferrífero, os municípios com mais conflito são também os de mais barragens: Nova Lima tem ${M['3144805'] ? M['3144805'].barr : '—'}, Ouro Preto ${M['3146107'] ? M['3146107'].barr : '—'}, Brumadinho ${M['3109006'] ? M['3109006'].barr : '—'}.</p>
        <p class="pequeno">Pontos escuros: barragens. Linhas: ferrovias. Cor do município: quantidade de barragens.</p>${perguntaBotao('Como está Nova Lima?')}`,
      mapa: { bbox: [[-44.45, -20.8], [-43.05, -19.5]], indice: 'barr', camadas: ['barr', 'ferro'] },
    },
    { // 7
      sobre: 'Lente D · impacto cruzado', titulo: 'A ferrovia para por uma pauta de Brasília',
      html: `<p>Garimpamos o acervo da imprensa regional de 2015 a 2026: <b>${R.bloqueios_ativo} bloqueios</b> de ferrovia, estrada ou portaria da mineração.</p>
        <div class="numeros"><div class="numero"><b>${R.bloqueios_classificados}</b><span>com a pauta identificada</span></div><div class="numero terra"><b>${pct(R.bloqueios_fora, R.bloqueios_classificados)}%</b><span>com pauta que não é do próprio ativo</span></div></div>
        <p>O impacto cruzado não é exceção: <b>é a maioria</b>. A TI Mãe Maria, cortada pela Estrada de Ferro Carajás e pela BR-222, aparece em ${maeMaria} bloqueios.</p>
        <p>Além disso, ${R.bloqueios_rodovia} bloqueios de rodovia pública por pautas de fora (caminhoneiros, saúde indígena, marco temporal).</p>
        ${lentesHTML('D')}<p class="pequeno">Pontos cheios: ativo da mineração. Anéis: rodovia pública.</p>${perguntaBotao('Quais foram os bloqueios da ferrovia?')}`,
      mapa: { bbox: [[-51.8, -7.2], [-47.2, -4.2]], indice: 'nenhum', camadas: ['bloq', 'ferro', 'tis'] },
    },
    { // 8
      sobre: 'Lente C · pauta organizada', titulo: 'Movimentos têm calendário',
      html: `<p>Boa parte da mobilização é organizada, pública e previsível. Acompanhar <b>quem mobiliza, com que pauta e quando</b> é antecipar.</p>
        <ul class="ranking">${mOrg.map((o) => `<li><span><b>${esc(o.Sigla)}</b> · ${esc(o['Pautas principais'] || '')}</span><span class="uf">${esc(o['Presença MG/PA'] || '')}</span></li>`).join('')}</ul>
        ${agenda.map((a) => `<div class="exemplo local"><b>${esc(a.Data)} · ${esc(a['Organização'])}</b>${esc(a.Pauta)}</div>`).join('')}
        <div class="regra"><b>Regra do radar:</b> acompanhar organizações, pautas e posições públicas. Nunca pessoas.</div>${perguntaBotao('Quais organizações o radar acompanha?')}`,
      mapa: { bbox: BBOX_TUDO, indice: 'nenhum', camadas: ['tis', 'bloq'] },
    },
    { // 9
      sobre: 'Lente B · controvérsia', titulo: 'Antes do protesto, o caso cresce em público',
      html: `<p>Notícia, nota da empresa, ação judicial, fato relevante ao mercado: o caso de uma empresa costuma crescer antes de virar bloqueio.</p>
        <p>A Lente B pergunta, semana a semana: <b>o caso está crescendo e escalando?</b> Começa pelas companhias abertas (fatos relevantes na CVM) e pelos eventos judiciais da ANM.</p>
        <p>Empresas mais citadas nos fatos do Observatório:</p>
        <ol class="ranking">${emp.map(([n, v]) => `<li><span>${esc(n)}</span><span>${fmt(v)}</span></li>`).join('')}</ol>
        ${lentesHTML('B')}${perguntaBotao('Quais empresas mais aparecem?')}`,
      mapa: { bbox: BBOX_TUDO, indice: 'nenhum', camadas: ['ocor'] },
    },
    { // 10
      sobre: 'Lente A · conflito local', titulo: 'Onde olhar nos próximos meses',
      html: `<p>A primeira régua é honesta e dura: <b>repetir o passado</b>.</p>
        <div class="numeros"><div class="numero terra"><b>${String(regua.p_com).replace('.', ',')}%</b><span>chance de conflito no mês onde houve conflito no último ano</span></div><div class="numero"><b>${String(regua.p_sem).replace('.', ',')}%</b><span>onde não houve</span></div></div>
        <p>${Math.round(regua.razao)} vezes mais. Qualquer modelo parece bom só por repetir o passado. O valor do radar está em <b>antecipar as estreias e as escaladas</b>, e é contra essa régua que ele vai ser medido.</p>
        <p>Hoje a régua acende <b>${regua.em_alerta_regua} municípios</b> (conflito nos 12 meses até ${mesAno(regua.ref)}).</p>
        <div class="aviso"><b>Apontar não é explicar.</b> O radar mostra onde olhar e o que pesou. Não afirma a causa.</div>${perguntaBotao('Onde o radar acende hoje?')}`,
      mapa: { bbox: BBOX_TUDO, indice: 'regua', camadas: [] },
    },
    { // 11
      sobre: 'Fontes e limites', titulo: `${R.fontes_total} fontes públicas avaliadas, uma a uma`,
      html: `<p>Antes de qualquer modelo, cada base pública foi testada na fonte e recebeu um veredicto.</p>
        <div class="pilha">${vered.map(([, v, c]) => `<i style="width:${(100 * v) / R.fontes_total}%;background:${c}"></i>`).join('')}</div>
        <div class="pilha-leg">${vered.filter(([, v]) => v).map(([n, v, c]) => `<span style="--c:${c}">${n} ${v}</span>`).join('')}</div>
        <div class="aviso"><b>O que ainda limita:</b><br>· O Observatório parou de cadastrar em mai/2026; serve para treinar o radar, não para alertar hoje.<br>· ${pct(R.cpt_escopo, R.escopo)}% das ocorrências vêm da CPT (Comissão Pastoral da Terra), que veda uso comercial. Elas aparecem identificadas.<br>· A imprensa de Minas cobre pouco os bloqueios; o Pará está bem coberto.</div>
        <p class="pequeno">Tudo o que aparece aqui tem link para a fonte original.</p>${perguntaBotao('Os dados são confiáveis?')}`,
      mapa: { bbox: BBOX_TUDO, indice: 'ocor', camadas: [] },
    },
    { // 12
      sobre: 'Sua vez', titulo: 'Explore o mapa e pergunte ao radar',
      html: `<p>No modo <b>Explorar</b> você liga e desliga camadas, escolhe o índice, filtra o período e abre a ficha de qualquer município ou ponto.</p>
        <p>A caixa <b>Pergunte ao radar</b> responde com os dados da própria página e cita a fonte. Para ir além, ela leva a pergunta, já com os dados, ao Claude ou ao ChatGPT.</p>
        ${lentesHTML('')}
        <div class="acoes"><button type="button" class="btn-pri" data-modo-ir="explorar">Abrir o mapa</button><button type="button" class="btn-sec" data-ir="0">Voltar ao início</button></div>`,
      mapa: { bbox: BBOX_TUDO, indice: 'regua', camadas: ['bloq'] },
    },
  ];
}

let PASSOS = [];
function irPasso(i, semMapa) {
  i = Math.max(0, Math.min(PASSOS.length - 1, i));
  S.passo = i;
  const p = PASSOS[i];
  $('#historia-corpo').innerHTML = `<article class="passo ${p.capa ? 'capa' : ''}"><div class="passo-sobre">${esc(p.sobre)}</div><h2>${esc(p.titulo)}</h2>${p.html}</article>`;
  $('#historia-corpo').scrollTop = 0;
  $('#contador').textContent = `${i + 1} / ${PASSOS.length}`;
  $('.historia-barra').style.width = `${(100 * (i + 1)) / PASSOS.length}%`;
  $('#ant').disabled = i === 0;
  const ultimo = i === PASSOS.length - 1;
  $('#prox').textContent = ultimo ? 'Abrir o mapa' : 'Próximo';
  $('#prox').dataset.ultimo = ultimo ? '1' : '';
  if (history.replaceState) history.replaceState(null, '', '#passo-' + (i + 1));
  if (semMapa || !map) return;
  S.indice = p.mapa.indice;
  S.anoIni = 2020; S.anoFim = 2025; S.ilegal = false; S.sel = null;
  Object.keys(S.camadas).forEach((k) => { S.camadas[k] = p.mapa.camadas.includes(k); });
  aplicarMapa();
  limparMarcadores();
  (p.mapa.marcas || []).forEach(([o, t, c]) => { if (o && o.x != null) marcar(o.x, o.y, t, c); });
  enquadrar(p.mapa.bbox, p.mapa.maxZoom);
}

// ------------------------------------------------------------------ modos e painéis
function mudarModo(modo) {
  S.modo = modo;
  document.body.classList.toggle('modo-apresentacao', modo === 'apresentacao');
  document.body.classList.toggle('modo-explorar', modo === 'explorar');
  $$('.modos button').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === modo));
  if (modo === 'apresentacao') {
    fecharFolhas();
    irPasso(S.passo);
  } else {
    limparMarcadores();
    if (history.replaceState) history.replaceState(null, '', '#explorar');
    if (S.indice === 'nenhum') S.indice = 'ocor';
    if (!Object.values(S.camadas).some(Boolean)) { S.camadas.bloq = true; }
    aplicarMapa();
    enquadrar(BBOX_TUDO);
  }
}

const celular = () => window.matchMedia('(max-width: 640px), (max-width: 920px) and (orientation: portrait)').matches;

function abrirGaveta(aba) {
  if (aba === 'controles') {
    fecharFolhas();
    $('#controles').classList.add('aberta');
    document.body.classList.add('folha-aberta');
    return;
  }
  if (celular()) $('#controles').classList.remove('aberta');
  $('#gaveta').classList.add('aberta');
  document.body.classList.add('gaveta-aberta');
  if (celular()) document.body.classList.add('folha-aberta');
  $$('.gaveta-abas [data-aba]').forEach((b) => b.classList.toggle('ativo', b.dataset.aba === aba));
  $('#aba-ficha').classList.toggle('ativa', aba === 'ficha');
  $('#aba-pergunte').classList.toggle('ativa', aba === 'pergunte');
}
function fecharFolhas() {
  $('#gaveta').classList.remove('aberta');
  if (celular()) $('#controles').classList.remove('aberta');
  document.body.classList.remove('gaveta-aberta', 'folha-aberta');
}

// ------------------------------------------------------------------ controles do modo Explorar
function montarControles() {
  $('#opcoes-indice').innerHTML = Object.entries(INDICES).map(([k, v]) =>
    `<label class="opcao"><input type="radio" name="indice" value="${k}"> <span>${v.nome}</span></label>`).join('');
  $('#opcoes-camadas').innerHTML = Object.entries(CAMADAS).map(([k, v]) =>
    `<label class="opcao"><input type="checkbox" value="${k}"> <span class="amostra ${v.forma}" style="background:${v.cor}"></span><span>${v.nome}</span><span class="conta" data-conta="${k}"></span></label>`).join('');
  const anos = [2020, 2021, 2022, 2023, 2024, 2025];
  $('#ano-ini').innerHTML = anos.map((a) => `<option>${a}</option>`).join('');
  $('#ano-fim').innerHTML = anos.map((a) => `<option>${a}</option>`).join('');
  const nomes = Object.values(S.D.municipios).map((m) => `${m.nome} (${m.uf})`).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  $('#lista-munis').innerHTML = nomes.map((n) => `<option value="${esc(n)}">`).join('');

  $('#opcoes-indice').addEventListener('change', (e) => { S.indice = e.target.value; aplicarMapa(); });
  $('#opcoes-camadas').addEventListener('change', (e) => { S.camadas[e.target.value] = e.target.checked; aplicarMapa(); });
  $('#ano-ini').addEventListener('change', (e) => { S.anoIni = +e.target.value; if (S.anoFim < S.anoIni) S.anoFim = S.anoIni; aplicarMapa(); });
  $('#ano-fim').addEventListener('change', (e) => { S.anoFim = +e.target.value; if (S.anoIni > S.anoFim) S.anoIni = S.anoFim; aplicarMapa(); });
  $('#chk-ilegal').addEventListener('change', (e) => { S.ilegal = e.target.checked; aplicarMapa(); });
  $('#busca').addEventListener('change', (e) => {
    const cod = acharMunicipio(e.target.value.replace(/\s*\((MG|PA)\)\s*$/, ''));
    if (cod) { abrirFichaMunicipio(cod, true); e.target.value = ''; e.target.blur(); }
  });
}

function desenharControles(contagem, nOcor) {
  $$('#opcoes-indice input').forEach((i) => { i.checked = i.value === S.indice; });
  $$('#opcoes-camadas input').forEach((i) => { i.checked = !!S.camadas[i.value]; });
  $('#ano-ini').value = S.anoIni; $('#ano-fim').value = S.anoFim; $('#chk-ilegal').checked = S.ilegal;
  const contas = { ocor: nOcor, bloq: S.D.bloqueios.filter((b) => b.x != null).length, barr: S.D.barragens.length, tis: S.tis.features.length, ferro: S.D.resumo.ferrovia_km + ' km' };
  $$('[data-conta]').forEach((el) => { const v = contas[el.dataset.conta]; el.textContent = typeof v === 'number' ? fmt(v) : v; });
  const ix = INDICES[S.indice];
  let leg = `<div>${esc(ix.desc)}</div>`;
  if (ix.cat) leg += ix.rot.map(([c, t]) => `<div style="display:flex;gap:6px;align-items:center;margin-top:4px"><i style="width:12px;height:12px;border-radius:3px;background:${c}"></i>${t}</div>`).join('');
  else if (ix.cores) leg += `<div class="escala">${ix.cores.map((c) => `<i style="background:${c}"></i>`).join('')}</div><div class="rotulos">${ix.rot.map((r) => `<span>${r}</span>`).join('')}</div>`;
  $('#legenda').innerHTML = leg;
}

// ------------------------------------------------------------------ fichas
function linksHTML(texto, max) {
  const urls = String(texto || '').match(/https?:\/\/[^\s;,]+/g) || [];
  if (!urls.length) return '<span class="meta">sem link</span>';
  return urls.slice(0, max || 3).map((u) => {
    let host = u;
    try { host = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { /* mantém */ }
    return `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(host)}</a>`;
  }).join(' ');
}

function registroHTML(o) {
  const M = S.D.municipios[o.m] || {};
  return `<div class="registro"><div class="data">${dataBR(o.d)} · ${esc(M.nome || '')} (${esc(M.uf || '')})</div>
    <div class="titulo">${esc(o.n)}</div>
    <div class="meta">${esc([o.a, o.o, o.e].filter(Boolean).join(' · '))}</div>
    ${o.t ? `<div class="meta">Pauta: ${esc(o.t)}${o.r ? ' · Forma: ' + esc(o.r) : ''}</div>` : ''}
    <div class="fontes">${linksHTML(o.l)}${o.c ? '<span class="chip cpt">fonte CPT · uso não comercial</span>' : ''}${o.il ? '<span class="chip ilegal">ilegal · fora do escopo</span>' : ''}</div></div>`;
}

function bloqueioHTML(b) {
  return `<div class="registro"><div class="data">${esc(b.d)} · ${esc(b.lugar)} (${esc(b.uf)})</div>
    <div class="titulo">${esc(b.ativo)} · ${esc(b.quem)}</div>
    <div class="meta">Pauta: ${esc(b.pauta)}</div>
    <div class="meta">Escala: ${esc(b.escala)}${b.alvo && b.alvo !== '—' ? ' · Alvo: ' + esc(b.alvo) : ''}</div>
    <div class="fontes">${linksHTML(b.l, 1)}</div></div>`;
}

function abrirFichaMunicipio(cod, voar) {
  const m = S.D.municipios[cod];
  if (!m) return;
  S.sel = cod;
  const lista = ocorrenciasFiltradas((o) => o.m === cod).sort((a, b) => (a.d < b.d ? 1 : -1));
  const todas = S.D.ocorrencias.filter((o) => o.m === cod && !o.il);
  const anos = {};
  for (let a = 2020; a <= 2025; a++) anos[a] = 0;
  todas.forEach((o) => { anos[o.d.slice(0, 4)]++; });
  const conta = (campo) => {
    const c = {};
    todas.forEach((o) => String(o[campo] || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => { c[s] = (c[s] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4);
  };
  const blq = S.D.bloqueios.filter((b) => b.m === cod);
  const reguaTxt = ['sem conflito registrado nos últimos 24 meses', 'conflito entre 12 e 24 meses atrás', 'aceso: conflito nos últimos 12 meses'][m.regua];
  const mostrar = 25;
  $('#ficha').innerHTML = `<h2>${esc(m.nome)}</h2><div class="sub">${m.uf === 'MG' ? 'Minas Gerais' : 'Pará'} · período ${S.anoIni}–${S.anoFim}</div>
    <div class="chips"><span class="chip terra">${fmt(lista.length)} ocorrências no período</span><span class="chip">Régua: ${reguaTxt}</span>
    <span class="chip">${m.barr} barragens</span><span class="chip">${fmt(m.kmf)} km de ferrovia</span>${blq.length ? `<span class="chip">${blq.length} bloqueios</span>` : ''}</div>
    ${todas.length ? `<h4>Ocorrências por ano (escopo)</h4>${barrasAnos(anos, '2025')}` : ''}
    ${todas.length ? `<h4>Pautas mais frequentes</h4><div class="chips">${conta('t').map(([k, v]) => `<span class="chip">${esc(k)} ${v}</span>`).join('')}</div>
    <h4>Empresas citadas</h4><div class="chips">${conta('e').map(([k, v]) => `<span class="chip">${esc(k)} ${v}</span>`).join('')}</div>` : ''}
    ${blq.length ? `<h4>Bloqueios (imprensa regional)</h4>${blq.map(bloqueioHTML).join('')}` : ''}
    <h4>Ocorrências ${lista.length > mostrar ? `(${mostrar} mais recentes de ${lista.length})` : ''}</h4>
    ${lista.length ? lista.slice(0, mostrar).map(registroHTML).join('') : '<p class="vazio">Nenhuma ocorrência no período.</p>'}
    <button type="button" class="link-pergunta mais" data-pergunta="Como está ${esc(m.nome)}?">Pergunte ao radar sobre ${esc(m.nome)}</button>`;
  abrirGaveta('ficha');
  $('#aba-ficha').scrollTop = 0;
  aplicarMapa();
  if (voar) {
    const f = S.geo.features.find((x) => x.properties.cod === cod);
    if (f) {
      const cs = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).flat(2);
      const xs = cs.map((p) => p[0]), ys = cs.map((p) => p[1]);
      const pad = folga();
      if (celular()) pad.bottom = window.innerHeight * 0.72 + 10;
      map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: pad, maxZoom: 9, duration: 1200 });
    }
  }
}

function abrirFichaPonto(f) {
  const p = f.properties, camada = f.layer.id;
  let html = '';
  if (camada === 'ocor') {
    const o = S.D.ocorrencias.find((x) => x.id === p.i);
    if (!o) return;
    const outros = S.D.ocorrencias.filter((x) => x.n === o.n && x.id !== o.id && !x.il).sort((a, b) => (a.d < b.d ? 1 : -1));
    html = `<h2>${esc(o.n)}</h2><div class="sub">Ocorrência · Observatório dos Conflitos da Mineração</div>${registroHTML(o)}
      ${outros.length ? `<h4>Outros fatos do mesmo conflito (${outros.length})</h4>${outros.slice(0, 10).map(registroHTML).join('')}` : ''}
      <button type="button" class="link-pergunta mais" data-muni="${o.m}">Ver o município</button>`;
  } else if (camada === 'bloq') {
    const b = S.D.bloqueios.find((x) => x.id === p.id);
    if (!b) return;
    html = `<h2>Bloqueio · ${esc(b.ativo)}</h2><div class="sub">${b.tipo === 'ativo da mineração' ? 'Ativo da mineração' : 'Rodovia pública'} · imprensa regional</div>${bloqueioHTML(b)}
      ${b.m ? `<button type="button" class="link-pergunta mais" data-muni="${b.m}">Ver o município</button>` : ''}`;
  } else if (camada === 'barr') {
    const b = S.D.barragens[p.i];
    html = `<h2>${esc(b.n)}</h2><div class="sub">Barragem de mineração · ANM (SIGBM)</div>
      <table class="anatomia"><tr><th>Empreendedor</th><td>${esc(b.e || 'não informado')}</td></tr><tr><th>Minério</th><td>${esc(b.min)}</td></tr>
      <tr><th>Situação</th><td>${esc(b.sit)}</td></tr><tr><th>Categoria de risco</th><td>${esc(b.cri)}</td></tr>
      <tr><th>Dano potencial</th><td>${esc(b.dpa)}</td></tr><tr><th>Nível de emergência</th><td>${esc(b.emerg)}</td></tr></table>
      <div class="fontes"><a href="https://app.anm.gov.br/SIGBM/Publico" target="_blank" rel="noopener noreferrer">SIGBM público (ANM)</a></div>
      ${b.m ? `<button type="button" class="link-pergunta mais" data-muni="${b.m}">Ver o município</button>` : ''}`;
  } else if (camada === 'tis-fill') {
    html = `<h2>TI ${esc(p.nome)}</h2><div class="sub">Terra indígena · FUNAI</div>
      <table class="anatomia"><tr><th>Povo</th><td>${esc(p.povo)}</td></tr><tr><th>Fase</th><td>${esc(p.fase)}</td></tr><tr><th>UF</th><td>${esc(p.uf)}</td></tr></table>`;
  }
  $('#ficha').innerHTML = html;
  if (S.modo === 'apresentacao') mudarModo('explorar');
  abrirGaveta('ficha');
  $('#aba-ficha').scrollTop = 0;
}

// ------------------------------------------------------------------ pergunte ao radar (respostas locais, com fonte)
const NAO_MUNI = new Set(['tocantins', 'bonito', 'formoso', 'esperanca', 'central', 'luz', 'prata', 'sacramento', 'brasilia', 'natal', 'vale', 'mineiros', 'campo', 'paraiso']);
let INDICE_NOMES = null;
function acharMunicipio(texto) {
  const t = ' ' + norm(texto) + ' ';
  if (!INDICE_NOMES) {
    INDICE_NOMES = Object.entries(S.D.municipios).map(([cod, m]) => [cod, norm(m.nome), m.n]).sort((a, b) => b[1].length - a[1].length);
  }
  let achado = null;
  for (const [cod, n, cnt] of INDICE_NOMES) {
    if (n.length < 4 || NAO_MUNI.has(n)) continue;
    if (t.includes(' ' + n + ' ')) {
      if (!achado || (n.length === achado.n.length && cnt > achado.cnt)) achado = { cod, n, cnt };
      else if (n.length < achado.n.length) break;
    }
  }
  return achado && achado.cod;
}

const EMPRESAS = [
  ['samarco', 'Samarco'], ['bhp', 'BHP'], ['anglogold', 'AngloGold'], ['anglo american', 'Anglo American'], ['hydro', 'Hydro'], ['norsk', 'Hydro'],
  ['alcoa', 'Alcoa'], ['belo sun', 'Belo Sun'], ['csn', 'CSN'], ['siderurgica nacional', 'CSN'], ['sigma', 'SIGMA'], ['taquaril', 'Taquaril'],
  ['arcelor', 'Arcel'], ['usiminas', 'Usiminas'], ['kinross', 'Kinross'], ['jaguar', 'Jaguar'], ['cbmm', 'CBMM'], ['vallourec', 'Vallourec'],
  ['mineracao rio do norte', 'Rio do Norte'], ['mrn', 'Rio do Norte'], ['imerys', 'Imerys'], ['gerdau', 'Gerdau'], ['nexa', 'Nexa'], ['curimbaba', 'Curimbaba'],
  ['vale', 'Vale'],
];
function acharEmpresa(texto) {
  const t = ' ' + norm(texto) + ' ';
  const e = EMPRESAS.find(([k]) => t.includes(' ' + k + ' '));
  return e ? e[1] : null;
}

const tem = (t, ...ks) => ks.some((k) => t.includes(k));

function responder(q) {
  const t = norm(q);
  const R = S.D.resumo;
  const cod = acharMunicipio(q);
  const emp = acharEmpresa(q);
  const ano = (t.match(/\b(202[0-5])\b/) || [])[1];

  if (tem(t, 'causa', 'por que acontece', 'porque acontece', 'culpa')) {
    return { html: `<p><b>O radar aponta, não explica.</b> Ele mostra onde a tensão aparece e o que pesou (histórico, estrutura, pauta). Afirmar causa exige outro tipo de estudo; no radar, causa só entra quando uma pessoa analisa o caso e registra.</p>`, ctx: 'Regra do método: apontar não é explicar.' };
  }
  if (tem(t, 'pessoa', 'lideranca', 'lider ', 'nome de quem')) {
    return { html: `<p><b>O radar não acompanha pessoas.</b> Ele acompanha organizações, pautas e posições públicas. Nomes de pessoas não entram na base, nem nos registros desta página.</p>`, ctx: 'Regra do método: organizações e pautas, nunca pessoas.' };
  }
  if (cod) return respostaMunicipio(cod, ano);
  if (emp) return respostaEmpresa(emp);
  if (tem(t, 'lente d', 'impacto cruzado', 'bloqueio', 'bloquei', 'ferrovia', 'efc', 'pauta de fora', 'carajas')) return respostaBloqueios();
  if (tem(t, 'lente c', 'pauta organizada', 'movimento', 'organizac', 'mab', 'mst', 'apib', 'calendario', 'agenda', 'indigen')) return respostaOrganizacoes();
  if (tem(t, 'lente b', 'controversia', 'empresa', 'companhia', 'mineradora')) return respostaEmpresas();
  if (tem(t, 'lente a', 'previs', 'regua', 'acende', 'alerta', 'proximos meses', 'risco')) return respostaRegua();
  if (tem(t, 'mais conflito', 'ranking', 'maiores', 'onde mais', 'concentra', 'top')) return respostaRanking(ano);
  if (ano) return respostaAno(ano);
  if (tem(t, 'fonte', 'dado', 'confiav', 'cpt', 'observatorio', 'limite', 'atualiz', 'organizad')) return respostaFontes();
  if (tem(t, 'o que e', 'conflito', 'conceito', 'definic', 'materializ', 'lente', 'radar', 'como funciona')) return respostaConceito();
  return {
    html: `<p>Não achei isso nos dados da página. Eu respondo sobre:</p><ul><li>um município de MG ou PA (ex.: "Como está Itabira?")</li><li>uma empresa (ex.: "Vale", "Hydro")</li><li>um ano (ex.: "O que aconteceu em 2024?")</li><li>as lentes, a régua, os bloqueios, as organizações e as fontes</li></ul><p>Para uma pergunta mais aberta, use os botões abaixo: eles levam sua pergunta, com o resumo dos dados, ao Claude ou ao ChatGPT.</p>`,
    ctx: contextoGeral(),
  };
}

function contextoGeral() {
  const R = S.D.resumo;
  return `Base: Observatório dos Conflitos da Mineração, MG e PA, ${R.primeira} a ${R.ultima}; ${R.escopo} ocorrências no escopo (sem garimpo/mineração ilegal), MG ${R.escopo_mg}, PA ${R.escopo_pa}. ` +
    `Municípios com mais ocorrências: ${topMunicipios(10).map(([, v]) => `${v.nome}-${v.uf} ${v.n}`).join(', ')}. ` +
    `Empresas mais citadas: ${topEmpresas(6).map(([n, v]) => `${n} ${v}`).join(', ')}. ` +
    `Régua "repetir o passado": ${R.regua.p_com}% de chance de conflito no mês com conflito nos 12 meses anteriores × ${R.regua.p_sem}% sem; ${R.regua.em_alerta_regua} municípios acesos até ${R.regua.ref}. ` +
    `Bloqueios de ativo da mineração 2015-2026 (imprensa regional): ${R.bloqueios_ativo}, ${R.bloqueios_classificados} com pauta identificada, ${R.bloqueios_fora} com pauta que não é do próprio ativo. ` +
    `Estrutura: ${R.barragens} barragens (ANM SIGBM), ${R.ferrovia_km} km de ferrovia (DNIT), ${R.tis} terras indígenas (FUNAI).`;
}

function respostaMunicipio(cod, ano) {
  const m = S.D.municipios[cod];
  let lista = S.D.ocorrencias.filter((o) => o.m === cod && !o.il);
  if (ano) lista = lista.filter((o) => o.d.startsWith(ano));
  lista.sort((a, b) => (a.d < b.d ? 1 : -1));
  const conta = (campo) => {
    const c = {};
    lista.forEach((o) => String(o[campo] || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => { c[s] = (c[s] || 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3);
  };
  const blq = S.D.bloqueios.filter((b) => b.m === cod);
  const pos = topMunicipios(1000).findIndex(([c]) => c === cod) + 1;
  const regua = ['não acende (sem conflito nos últimos 24 meses)', 'em observação (conflito entre 12 e 24 meses atrás)', 'acesa (conflito nos últimos 12 meses)'][m.regua];
  let html = `<p><b>${esc(m.nome)} (${m.uf})</b>${ano ? ` em ${ano}` : ''}: ${fmt(lista.length)} ocorrências no escopo${!ano && pos ? `, ${pos}º lugar entre os ${S.D.resumo.regua.munis_com_conflito} municípios com conflito registrado` : ''}.</p>`;
  if (lista.length) {
    html += `<p>Pautas mais frequentes: ${conta('t').map(([k, v]) => `${esc(k)} (${v})`).join(', ')}. Empresas mais citadas: ${conta('e').map(([k, v]) => `${esc(k)} (${v})`).join(', ') || 'não informado'}. Última ocorrência: ${dataBR(lista[0].d)}.</p>`;
  }
  html += `<p>Régua da Lente A: ${regua}. Estrutura: ${m.barr} barragens de mineração e ${fmt(m.kmf)} km de ferrovia.${blq.length ? ` ${blq.length} bloqueio(s) na imprensa regional.` : ''}</p>`;
  if (lista.length) html += `<p>Mais recentes:</p>${lista.slice(0, 3).map(registroHTML).join('')}`;
  html += `<p><button type="button" class="link-pergunta" data-muni="${cod}">Abrir a ficha completa</button></p>`;
  const ctx = `Município: ${m.nome}-${m.uf}. ${lista.length} ocorrências no escopo${ano ? ' em ' + ano : ' (2020-2025)'}; régua: ${regua}; ${m.barr} barragens; ${m.kmf} km de ferrovia; ${blq.length} bloqueios. ` +
    `Ocorrências (data | conflito | atingidos | objeto | empresa | pauta | forma | link): ` +
    lista.slice(0, 14).map((o) => `${o.d} | ${o.n} | ${o.a} | ${o.o} | ${o.e} | ${o.t} | ${o.r || '-'} | ${(String(o.l).match(/https?:\/\/[^\s;,]+/) || [''])[0]}`).join(' ;; ');
  return { html, ctx };
}

function respostaEmpresa(chave) {
  const k = norm(chave);
  const lista = S.D.ocorrencias.filter((o) => !o.il && norm(o.e).includes(k)).sort((a, b) => (a.d < b.d ? 1 : -1));
  if (!lista.length) return { html: `<p>Não há ocorrências com "${esc(chave)}" na base do Observatório para MG e PA.</p>`, ctx: contextoGeral() };
  const c = {};
  lista.forEach((o) => { c[o.m] = (c[o.m] || 0) + 1; });
  const munis = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([cod, v]) => `${S.D.municipios[cod].nome} (${v})`);
  const nomes = [...new Set(lista.map((o) => o.e))].slice(0, 3);
  const html = `<p><b>${fmt(lista.length)} ocorrências</b> citam ${esc(nomes.join(' / '))}, em ${Object.keys(c).length} municípios. Onde mais: ${esc(munis.join(', '))}.</p>
    <p>Na Lente B (controvérsia), a pergunta seria: esse caso público está crescendo semana a semana? O protótipo ainda não mede isso; mostra o histórico.</p>
    <p>Mais recentes:</p>${lista.slice(0, 3).map(registroHTML).join('')}`;
  const ctx = `Empresa: ${nomes.join(' / ')}. ${lista.length} ocorrências em ${Object.keys(c).length} municípios; onde mais: ${munis.join(', ')}. Recentes: ` +
    lista.slice(0, 12).map((o) => `${o.d} | ${S.D.municipios[o.m].nome} | ${o.n} | ${o.t} | ${o.r || '-'} | ${(String(o.l).match(/https?:\/\/[^\s;,]+/) || [''])[0]}`).join(' ;; ');
  return { html, ctx };
}

function respostaEmpresas() {
  const e = topEmpresas(8);
  return { html: `<p>Empresas mais citadas nos fatos do Observatório (MG e PA, ${S.D.resumo.primeira.slice(0, 4)}–${S.D.resumo.ultima.slice(0, 4)}):</p><ol class="ranking">${e.map(([n, v]) => `<li><span>${esc(n)}</span><span>${fmt(v)}</span></li>`).join('')}</ol>
    <p>A Lente B (controvérsia) vai acompanhar, semana a semana, se o caso público de uma empresa está crescendo. Começa pelas companhias abertas, pelos fatos relevantes publicados na CVM.</p>`, ctx: contextoGeral() };
}

function respostaRanking(ano) {
  let top;
  if (ano) {
    const c = {};
    S.D.ocorrencias.forEach((o) => { if (!o.il && o.d.startsWith(ano)) c[o.m] = (c[o.m] || 0) + 1; });
    top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cod, n]) => [cod, { ...S.D.municipios[cod], n }]);
  } else top = topMunicipios(10);
  return { html: `<p>Municípios com mais ocorrências${ano ? ' em ' + ano : ''}:</p><ol class="ranking">${top.map(([, v]) => `<li><span>${esc(v.nome)}<span class="uf">${v.uf}</span></span><span>${fmt(v.n)}</span></li>`).join('')}</ol><p>Toque num deles no mapa para abrir a ficha.</p>`, ctx: contextoGeral() };
}

function respostaAno(ano) {
  const lista = S.D.ocorrencias.filter((o) => !o.il && o.d.startsWith(ano));
  const c = {};
  lista.forEach((o) => String(o.t).split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => { c[s] = (c[s] || 0) + 1; }));
  const pautas = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const r = respostaRanking(ano);
  return { html: `<p><b>${ano}:</b> ${fmt(lista.length)} ocorrências no escopo${ano === '2025' ? ' (ano incompleto: o Observatório cadastra em lotes)' : ''}. Pautas mais frequentes: ${pautas.map(([k, v]) => `${esc(k)} (${v})`).join(', ')}.</p>` + r.html, ctx: contextoGeral() };
}

function respostaRegua() {
  const R = S.D.resumo.regua;
  const acesos = Object.values(S.D.municipios).filter((m) => m.regua === 2).sort((a, b) => b.n - a.n).slice(0, 10);
  return { html: `<p><b>Lente A, versão mínima: repetir o passado.</b> Onde houve conflito nos 12 meses anteriores, a chance de conflito no mês é ${String(R.p_com).replace('.', ',')}%; onde não houve, ${String(R.p_sem).replace('.', ',')}%. São ${Math.round(R.razao)} vezes.</p>
    <p>Hoje a régua acende ${R.em_alerta_regua} municípios (12 meses até ${mesAno(R.ref)}). Os de maior histórico: ${acesos.map((m) => esc(m.nome)).join(', ')}.</p>
    <p>O modelo do radar só se justifica se ganhar dessa régua, principalmente nas <b>estreias</b> (onde nunca houve conflito) e nas <b>escaladas</b>. Apontar não é explicar.</p>`, ctx: contextoGeral() };
}

function respostaBloqueios() {
  const R = S.D.resumo;
  const ativos = S.D.bloqueios.filter((b) => b.id.startsWith('M')).sort((a, b) => (a.d.split('/').reverse().join('') < b.d.split('/').reverse().join('') ? 1 : -1));
  return { html: `<p><b>Lente D, impacto cruzado:</b> pauta de fora que para um ativo da mineração.</p>
    <p>Na imprensa regional de 2015 a 2026: ${R.bloqueios_ativo} bloqueios de ativo da mineração, ${R.bloqueios_classificados} com pauta identificada, e ${R.bloqueios_fora} deles (${pct(R.bloqueios_fora, R.bloqueios_classificados)}%) com pauta que não é do próprio ativo. Mais ${R.bloqueios_rodovia} bloqueios de rodovia pública por pautas de fora.</p>
    <p>Mais recentes:</p>${ativos.slice(0, 4).map(bloqueioHTML).join('')}`,
    ctx: `Bloqueios de ativo da mineração (data | lugar | ativo | quem | pauta | escala | link): ` + ativos.slice(0, 16).map((b) => `${b.d} | ${b.lugar}-${b.uf} | ${b.ativo} | ${b.quem} | ${b.pauta} | ${b.escala} | ${b.l}`).join(' ;; ') };
}

function respostaOrganizacoes() {
  const O = S.D.organizacoes || [], A = S.D.agenda || [];
  return { html: `<p><b>Lente C, pauta organizada:</b> quem se mobiliza, com que pauta e quando. O protótipo lista ${O.length} organizações e ${A.length} datas de mobilização recorrentes.</p>
    <ul>${O.slice(0, 10).map((o) => `<li><b>${esc(o.Sigla)}</b> (${esc(o.Tipo || '')}): ${esc(o['Pautas principais'] || '')}. Presença: ${esc(o['Presença MG/PA'] || '')}.</li>`).join('')}</ul>
    <p>Agenda:</p><ul>${A.slice(0, 6).map((a) => `<li><b>${esc(a.Data)}</b> · ${esc(a['Organização'])}: ${esc(a.Pauta)}</li>`).join('')}</ul>
    <p>Regra: organizações e pautas, nunca pessoas.</p>`,
    ctx: 'Organizações: ' + O.map((o) => `${o.Sigla} (${o['Pautas principais']}; ${o['Presença MG/PA']})`).join('; ') + '. Agenda: ' + A.map((a) => `${a.Data} ${a['Organização']}: ${a.Pauta}`).join('; ') };
}

function respostaFontes() {
  const R = S.D.resumo;
  return { html: `<p>Foram avaliadas <b>${R.fontes_total} fontes públicas</b>, cada uma testada na origem: ${Object.entries(R.fontes_veredicto).map(([k, v]) => `${esc(k.replace(/ \(.*\)/, '').toLowerCase())} ${v}`).join(', ')}.</p>
    <p>A base principal desta página é o <b>Observatório dos Conflitos da Mineração</b>. Limites que importam:</p>
    <ul><li>Ele cadastra em lotes e parou em mai/2026: serve para treinar o radar, não para alertar hoje.</li>
    <li>${pct(R.cpt_escopo, R.escopo)}% das ocorrências vêm da CPT, que veda uso comercial; elas aparecem marcadas.</li>
    <li>${R.ultima.slice(0, 4)} está incompleto.</li><li>Os bloqueios vêm da imprensa regional: o Pará está bem coberto, Minas pouco.</li></ul>
    <p>Todo registro tem o link da fonte original.</p>`, ctx: contextoGeral() };
}

function respostaConceito() {
  return { html: `<p><b>Conflito</b>, para o radar, é toda tensão que vira fato entre a mineração (minas, barragens, ferrovias, estradas) e a sociedade (comunidades e movimentos), por pauta do próprio empreendimento ou por pauta de fora que o atinge.</p>
    <p>Cada fato vira uma ficha padronizada: quando, onde, quem, contra o quê, pauta, forma e fonte. Sobre essa base, quatro lentes:</p>
    <ul><li><b>A · Conflito local:</b> onde a tensão deve aparecer nos próximos meses.</li><li><b>B · Controvérsia:</b> o caso público de uma empresa está crescendo?</li>
    <li><b>C · Pauta organizada:</b> quem mobiliza, com que pauta e quando.</li><li><b>D · Impacto cruzado:</b> pauta de fora que para um ativo.</li></ul>`, ctx: contextoGeral() };
}

function promptExterno(q, ctx) {
  const base = 'Você é analista do Radar de Conflitos Sociais, protótipo que acompanha a tensão entre a mineração e a sociedade em Minas Gerais e no Pará, só com dado público. ' +
    'Regras: aponte onde olhar, sem afirmar causa; fale de organizações e pautas, nunca de pessoas; diga quando o dado não cobre a pergunta; cite os links das fontes. ' +
    'Limites: o Observatório dos Conflitos da Mineração cadastra em lotes e parou em mai/2026; parte das ocorrências vem da CPT (uso não comercial).';
  let p = `${base}\n\nDados do radar:\n${ctx}\n\nPergunta: ${q}`;
  if (p.length > 5500) p = p.slice(0, 5500) + '…\n\nPergunta: ' + q;
  return p;
}

function perguntar(q) {
  q = String(q || '').trim();
  if (!q) return;
  if (S.modo !== 'explorar') mudarModo('explorar');
  abrirGaveta('pergunte');
  const conv = $('#conversa');
  conv.insertAdjacentHTML('beforeend', `<div class="msg eu">${esc(q)}</div>`);
  const r = responder(q);
  const p = encodeURIComponent(promptExterno(q, r.ctx));
  conv.insertAdjacentHTML('beforeend', `<div class="msg radar">${r.html}<div class="aprofundar">Aprofundar com IA:
    <a href="https://claude.ai/new?q=${p}" target="_blank" rel="noopener noreferrer">Claude</a>
    <a href="https://chatgpt.com/?q=${p}" target="_blank" rel="noopener noreferrer">ChatGPT</a></div></div>`);
  const msgs = $$('.msg', conv);
  msgs[msgs.length - 2].scrollIntoView({ block: 'start', behavior: 'smooth' });
  $('#pergunta').value = '';
}

function montarPergunte() {
  const sug = ['Onde o radar acende hoje?', 'Como está Brumadinho?', 'O que é impacto cruzado?', 'Quais empresas mais aparecem?', 'O que aconteceu em 2024?', 'Os dados são confiáveis?'];
  $('#sugestoes').innerHTML = sug.map((s) => `<button type="button" data-pergunta="${esc(s)}">${esc(s)}</button>`).join('');
  $('#conversa').innerHTML = `<div class="msg radar"><p>Pergunte sobre um município, uma empresa, um ano, as lentes ou as fontes. Respondo com os dados desta página e mostro a fonte de cada fato.</p></div>`;
  $('#form-pergunta').addEventListener('submit', (e) => { e.preventDefault(); perguntar($('#pergunta').value); });
}

// ------------------------------------------------------------------ eventos gerais
function ligarEventos() {
  $('#ant').addEventListener('click', () => irPasso(S.passo - 1));
  $('#prox').addEventListener('click', () => ($('#prox').dataset.ultimo ? mudarModo('explorar') : irPasso(S.passo + 1)));
  $$('.modos button').forEach((b) => b.addEventListener('click', () => mudarModo(b.dataset.modo)));
  $$('[data-aba]').forEach((b) => b.addEventListener('click', () => abrirGaveta(b.dataset.aba)));
  $('#fechar-gaveta').addEventListener('click', fecharFolhas);
  $('#fechar-controles').addEventListener('click', fecharFolhas);
  $$('[data-abrir]').forEach((b) => b.addEventListener('click', () => {
    const alvo = b.dataset.abrir;
    if (alvo === 'controles' && $('#controles').classList.contains('aberta') && celular()) { fecharFolhas(); return; }
    abrirGaveta(alvo);
  }));
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-pergunta],[data-ir],[data-modo-ir],[data-muni]');
    if (!el) return;
    if (el.dataset.pergunta) perguntar(el.dataset.pergunta);
    else if (el.dataset.ir) irPasso(+el.dataset.ir);
    else if (el.dataset.modoIr) mudarModo(el.dataset.modoIr);
    else if (el.dataset.muni) abrirFichaMunicipio(el.dataset.muni, true);
  });
  document.addEventListener('keydown', (e) => {
    if (S.modo !== 'apresentacao' || /input|select|textarea/i.test(e.target.tagName)) return;
    if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); irPasso(S.passo + 1); }
    if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); irPasso(S.passo - 1); }
  });
  // deslizar o cartão da história para os lados
  let x0 = null, y0 = null;
  const h = $('#historia');
  h.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  h.addEventListener('touchend', (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) irPasso(S.passo + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
  let t;
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => { if (S.modo === 'apresentacao') enquadrar(PASSOS[S.passo].mapa.bbox); }, 250); });
}

// ------------------------------------------------------------------ início
async function iniciar() {
  const pega = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); });
  criarMapa();
  const carregouMapa = new Promise((ok) => map.on('load', ok));
  [S.D, S.geo, S.ferro, S.tis] = await Promise.all([pega('dados/radar.json'), pega('dados/municipios.json'), pega('dados/ferrovias.json'), pega('dados/terras-indigenas.json')]);
  PASSOS = passos();
  montarControles();
  montarPergunte();
  ligarEventos();
  // o texto aparece já; o mapa entra quando terminar de carregar
  const h = location.hash;
  const m = h.match(/^#passo-(\d+)/);
  irPasso(m ? +m[1] - 1 : 0, true);
  if (h === '#explorar') mudarModo('explorar');
  $('#carregando').classList.add('saiu');
  await carregouMapa;
  montarCamadas();
  if (S.modo === 'apresentacao') irPasso(S.passo);
  else { aplicarMapa(); if (!S.sel) enquadrar(BBOX_TUDO); }
}

iniciar().catch((e) => {
  console.error(e);
  $('#carregando').innerHTML = '<div><p>Não foi possível carregar o radar.</p><p class="pequeno">Verifique a conexão e recarregue a página.</p></div>';
});
})();
