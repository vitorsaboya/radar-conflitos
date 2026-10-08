# Radar de Conflitos Sociais — protótipo

Onde a mineração e a sociedade entram em atrito em Minas Gerais e no Pará, só com dado público.

**Abrir:** https://vitorsaboya.github.io/radar-conflitos/

A página tem dois modos:

- **Apresentação:** 12 passos que explicam o conceito, a base comum e as quatro lentes do radar, com o mapa acompanhando.
- **Explorar:** mapa com camadas, índices por município, filtro de período, ficha de cada município ou ponto e a caixa "Pergunte ao radar".

A caixa de perguntas responde no próprio navegador, com os dados da página, e cita a fonte de cada fato. Para perguntas mais abertas, ela leva a pergunta com um resumo dos dados ao Claude ou ao ChatGPT.

## Fontes

| Camada | Fonte |
|---|---|
| Ocorrências de conflito 2020–2025 | Observatório dos Conflitos da Mineração no Brasil (camada pública ArcGIS) |
| Bloqueios de ativo e rodovia 2015–2026 | Levantamento próprio no acervo da imprensa regional (links em cada registro) |
| Malha municipal | IBGE |
| Ferrovias | DNIT (camadas da EPL) |
| Barragens de mineração | ANM — SIGBM |
| Terras indígenas | FUNAI |
| Mapa de fundo | Esri, HERE, Garmin, © OpenStreetMap |

**Limites conhecidos.** O Observatório cadastra em lotes e parou de cadastrar em mai/2026; 2025 está incompleto. Parte das ocorrências vem da CPT (Comissão Pastoral da Terra), que veda uso comercial; esses registros aparecem identificados. O escopo do protótipo exclui garimpo e mineração ilegal (dá para incluir no filtro). O radar acompanha organizações e pautas, nunca pessoas.

Protótipo de demonstração, sem fins comerciais.
