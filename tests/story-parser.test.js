import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CityMap } from '../src/world/city-map.js';
import {
  parseStoryManifest,
  parseItemMarkdown,
  parseCharacterMarkdown,
  parseMissionMarkdown,
  parseEncounterMarkdown,
  parseMapMarkdown,
  replaceLocationCodesWithNames,
  validateAssetPath,
  StoryParseError
} from '../src/story/story-parser.js';
import {
  collectMissionAssetUrls,
  collectStoryAssetUrls,
  discoverTypeBackgroundPool,
  getCharacterSidePngCandidates,
  getCutsceneBackgroundCandidates,
  pickCutsceneBackground,
  getPendingMissionAssetUrls,
  getSplashPngCandidates,
  preloadMissionAssets,
  preloadStoryAssets,
  resolveFirstExistingAsset,
  resolveStoryFaviconUrl,
  isAssetLoaded,
  clearLoadedAssets,
  parseNpcLinesMarkdown
} from '../src/story/story-loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storyDir = path.resolve(__dirname, '../story');

test('carrega e valida o pacote de história de exemplo completo contra a cidade-base', () => {
  const cityMap = new CityMap();
  const manifest = parseStoryManifest(fs.readFileSync(path.join(storyDir, 'story.md'), 'utf8'), 'story.md');

  assert.equal(manifest.title, 'GTA SQL: Bajo Mundo de Datos');
  assert.ok(manifest.characters.length >= 3);
  assert.ok(manifest.missions.length >= 2);

  for (const charId of manifest.characters) {
    const raw = fs.readFileSync(path.join(storyDir, 'characters', `${charId}.md`), 'utf8');
    const charDef = parseCharacterMarkdown(raw, `characters/${charId}.md`);
    assert.equal(charDef.id, charId);
    assert.ok(charDef.sprites.top);
    assert.ok(charDef.sprites.front);
    assert.ok(charDef.sprites.left);
    assert.ok(charDef.sprites.right);
  }

  const m1 = parseMissionMarkdown(
    fs.readFileSync(path.join(storyDir, 'missions', '01-libreta-quemada.md'), 'utf8'),
    'missions/01-libreta-quemada.md',
    cityMap
  );
  assert.equal(m1.startLocation, 'CASA-01');
  assert.equal(m1.targetLocation, 'COM-320');
  assert.ok(m1.introCutscene.steps.length >= 2);
  const choiceStep = m1.introCutscene.steps.find((s) => s.choices?.length);
  assert.ok(choiceStep);
  assert.equal(choiceStep.choices.length, 2);
  assert.ok(choiceStep.choices.every((c) => c.outcome === 'next'));
  assert.ok(m1.outroCutscene.steps.some((step) => step.type === 'deliver' && step.itemId === 'libreta'));
  assert.ok(m1.outroCutscene.steps.some((step) => step.type === 'sql' && step.challengeId === 'mision-1'));

  assert.equal(manifest.missions.length, 9);
  assert.equal(manifest.collectibles.length, 10);
  const disqueteItem = parseItemMarkdown(
    fs.readFileSync(path.join(storyDir, 'items', 'disquete.md'), 'utf8'),
    'items/disquete.md'
  );
  assert.equal(disqueteItem.category, 'extra');
  assert.equal(disqueteItem.rarity, 'normal');
  const libretaItem = parseItemMarkdown(
    fs.readFileSync(path.join(storyDir, 'items', 'libreta.md'), 'utf8'),
    'items/libreta.md'
  );
  assert.equal(libretaItem.category, 'missao');
});

test('rejeita caminhos de assets externos ou com traversal', () => {
  assert.throws(() => validateAssetPath('../fora.png', 'story.md', 4), StoryParseError);
  assert.throws(() => validateAssetPath('https://exemplo.com/img.png', 'story.md', 4), StoryParseError);
  assert.throws(() => validateAssetPath('/etc/passwd', 'story.md', 4), StoryParseError);
  assert.equal(validateAssetPath('./assets/alex-top.svg', 'alex.md', 5), 'assets/alex-top.svg');
});

test('sinaliza erro descritivo para frontmatter inválido ou código de local inexistente', () => {
  const cityMap = new CityMap();
  assert.throws(
    () => parseStoryManifest('title: Sem delimitador', 'story.md'),
    (err) => err instanceof StoryParseError && err.message.includes('story.md:1')
  );

  const badMission = `---
id: m-err
title: Missão Inválida
start: CASA-01
target: NAO-EXISTE-99
---
`;
  assert.throws(
    () => parseMissionMarkdown(badMission, 'missions/err.md', cityMap),
    (err) => err instanceof StoryParseError && err.message.includes('NAO-EXISTE-99')
  );
});

test('prioriza PNG na pasta do personagem para visão lateral e faz fallback quando ausente', async () => {
  const candidates = getCharacterSidePngCandidates('./story', 'alex', 'left');
  assert.equal(candidates[0], './story/characters/alex-left.png');
  assert.equal(candidates[2], './story/characters/alex.png');
  assert.equal(candidates[3], './story/characters/alex/alex.png');

  const found = await resolveFirstExistingAsset(candidates, async (url) => url.endsWith('characters/alex.png'));
  assert.equal(found, './story/characters/alex.png');

  const none = await resolveFirstExistingAsset(candidates, async () => false);
  assert.equal(none, '');
});

test('prioriza PNG personalizado para tela de abertura e faz fallback para padrão quando ausente', async () => {
  const candidates = getSplashPngCandidates('./story', 'assets/splash.svg');
  assert.deepEqual(candidates, [
    './story/splash/splash-start.png',
    './story/splash.png',
    './story/assets/splash.png',
  ]);

  const customCandidates = getSplashPngCandidates('./story', 'assets/capa.svg');
  assert.deepEqual(customCandidates, [
    './story/splash/splash-start.png',
    './story/splash.png',
    './story/assets/splash.png',
    './story/assets/capa.png',
  ]);

  const found = await resolveFirstExistingAsset(candidates, async (url) => url === './story/splash/splash-start.png');
  assert.equal(found, './story/splash/splash-start.png');

  const fallback = await resolveFirstExistingAsset(candidates, async () => false);
  assert.equal(fallback, '');
});

test('map/map.md mapeia todos os locais da cidade e substitui códigos em falas e textos', () => {
  const cityMap = new CityMap();
  const mapRaw = fs.readFileSync(path.join(storyDir, 'map/map.md'), 'utf8');
  const locationNames = parseMapMarkdown(mapRaw, 'map/map.md');

  assert.equal(locationNames.get('CASA-01'), 'Guarida de la Familia Ceibo');
  assert.equal(locationNames.get('RUA-01'), 'Av. 18 de Julio');
  assert.equal(locationNames.get('COM-320'), 'Taller de Chispa');

  for (const code of cityMap.locationsByCode.keys()) {
    assert.ok(locationNames.has(code), `Código ausente em map/map.md: ${code}`);
    assert.ok(locationNames.get(code).length > 0);
  }

  const speech = 'llevá esto a la CASA-01 por la RUA-02';
  assert.equal(
    replaceLocationCodesWithNames(speech, locationNames),
    'llevá esto a la Guarida de la Familia Ceibo por la Rambla Sur'
  );
});

test('resolve cenários PNG/JPG de cutscene por código ou tipo (RUA, PRACA, COM, CASA) e possui exemplos', async () => {
  for (const prefix of ['rua', 'praca', 'com', 'casa']) {
    const hasExample = [`${prefix}.png`, `${prefix}.jpg`, `${prefix}-1.png`, `${prefix}-1.jpg`]
      .some((name) => fs.existsSync(path.join(storyDir, 'map', name)));
    assert.equal(hasExample, true, `Ausente: story/map/${prefix}(-1).png ou .jpg`);
  }

  const candidates = getCutsceneBackgroundCandidates('./story', 'Frente da CASA-01', 'CASA-01');
  assert.deepEqual(candidates, [
    './story/map/CASA-01.png',
    './story/map/CASA-01.jpg',
    './story/map/casa-01.png',
    './story/map/casa-01.jpg',
    './story/map/casa.png',
    './story/map/casa.jpg',
  ]);

  const resolved = await resolveFirstExistingAsset(candidates, async (url) => url === './story/map/casa.png');
  assert.equal(resolved, './story/map/casa.png');
});

test('coleta URLs únicas e pré-carrega assets da história reportando progresso até 100%', async () => {
  const fakeStory = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['alex', { sprites: { top: './story/assets/alex-top.svg', left: './story/characters/alex.png', right: './story/characters/alex.png' } }],
      ['clara', { sprites: { front: './story/assets/clara-front.svg', empty: '' } }],
    ]),
    missions: [
      {
        introCutscene: { backgroundImage: './story/map/casa.png' },
        outroCutscene: { backgroundImage: './story/map/com.jpg' },
      },
      {
        introCutscene: { backgroundImage: './story/map/casa.png' },
        outroCutscene: { backgroundImage: '' },
      },
    ],
  };

  const urls = collectStoryAssetUrls(fakeStory);
  assert.deepEqual(urls, [
    './story/splash.png',
    './story/assets/alex-top.svg',
    './story/characters/alex.png',
    './story/assets/clara-front.svg',
    './story/map/casa.png',
    './story/map/com.jpg',
  ]);

  const progressEvents = [];
  const summary = await preloadStoryAssets(fakeStory, {
    loadImageFn: async (url) => !url.endsWith('com.jpg'),
    onProgress: (ev) => progressEvents.push(ev),
  });

  assert.equal(summary.total, 6);
  assert.equal(summary.loaded, 6);
  assert.deepEqual(summary.failed, ['./story/map/com.jpg']);
  assert.equal(progressEvents.length, 6);
  assert.equal(progressEvents.at(-1).ratio, 1);
});

test('pré-carrega apenas splash e recursos da missão 0 na abertura e carrega delta nas missões seguintes', async () => {
  clearLoadedAssets();
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['guanabara', { sprites: { left: './story/characters/guanabara.png' } }],
      ['beto', { sprites: { right: './story/characters/beto.png' } }],
      ['clara', { sprites: { right: './story/characters/clara.png' } }],
    ]),
    items: new Map([
      ['maleta', { imageUrl: './story/assets/item-maleta.svg' }],
      ['chave', { imageUrl: './story/assets/item-chave.svg' }],
    ]),
    missions: [
      {
        giveItem: 'maleta',
        requireItem: '',
        introCutscene: { leftChar: 'guanabara', rightChar: 'beto', backgroundImage: './story/map/casa.png' },
        outroCutscene: { leftChar: 'guanabara', rightChar: 'beto', backgroundImage: './story/map/rua.png' },
      },
      {
        giveItem: '',
        requireItem: 'chave',
        introCutscene: { leftChar: 'guanabara', rightChar: 'clara', backgroundImage: './story/map/com.jpg' },
        outroCutscene: { leftChar: 'guanabara', rightChar: 'clara', backgroundImage: './story/map/praca.png' },
      },
    ],
  };

  const preloadedUrls = new Set();
  const m0Summary = await preloadMissionAssets(story, 0, {
    includeSplash: true,
    preloadedUrls,
    loadImageFn: async () => true,
  });

  assert.equal(m0Summary.total, 6);
  assert.equal(preloadedUrls.has('./story/splash.png'), true);
  assert.equal(preloadedUrls.has('./story/characters/clara.png'), false);
  assert.equal(preloadedUrls.has('./story/assets/item-chave.svg'), false);

  const pendingM1 = getPendingMissionAssetUrls(story, 1, preloadedUrls, { includeSplash: false });
  assert.deepEqual(pendingM1, [
    './story/map/com.jpg',
    './story/map/praca.png',
    './story/characters/clara.png',
    './story/assets/item-chave.svg',
  ]);

  const m1Summary = await preloadMissionAssets(story, 1, {
    includeSplash: false,
    preloadedUrls,
    loadImageFn: async () => true,
  });
  assert.equal(m1Summary.total, 4);
  assert.equal(getPendingMissionAssetUrls(story, 1, preloadedUrls, { includeSplash: false }).length, 0);
});

test('detecta variantes numeradas por tipo e sorteia cenários evitando repetições consecutivas', async () => {
  const existing = new Set([
    './story/map/casa-1.png',
    './story/map/casa-2.jpg',
    './story/map/casa-3.jpg',
  ]);
  const pool = await discoverTypeBackgroundPool('./story', 'casa', async (url) => existing.has(url));
  assert.deepEqual(pool, [
    './story/map/casa-1.png',
    './story/map/casa-2.jpg',
    './story/map/casa-3.jpg',
  ]);

  const seen = new Set();
  let recent = [];
  for (let i = 0; i < 3; i += 1) {
    const res = pickCutsceneBackground(pool, recent, () => 0);
    assert.equal(seen.has(res.url), false);
    seen.add(res.url);
    recent = res.nextRecent;
  }
  assert.equal(seen.size, 3);

  const afterCycle = pickCutsceneBackground(pool, recent, () => 0);
  assert.notEqual(afterCycle.url, recent[recent.length - 1]);
});

test('lê page_title opcional do story.md para personalizar o título da aba', () => {
  const custom = parseStoryManifest(
    '---\ntitle: Minha História\npage_title: Título da Aba\ncharacters: guanabara\nmissions: 01-caixa-secreta\n---\n',
    'story.md'
  );
  assert.equal(custom.title, 'Minha História');
  assert.equal(custom.pageTitle, 'Título da Aba');

  const fallback = parseStoryManifest(
    '---\ntitle: Minha História\ncharacters: guanabara\nmissions: 01-caixa-secreta\n---\n',
    'story.md'
  );
  assert.equal(fallback.pageTitle, '');
});

test('prioriza favicon na raiz de story e faz fallback para ícone padrão quando ausente', async () => {
  const withSvg = await resolveStoryFaviconUrl('./story', async (url) => url === './story/favicon.svg');
  assert.equal(withSvg, './story/favicon.svg');

  const withPng = await resolveStoryFaviconUrl('./story', async (url) => url === './story/favicon.png');
  assert.equal(withPng, './story/favicon.png');

  const fallback = await resolveStoryFaviconUrl('./story', async () => false);
  assert.equal(fallback, './icon.svg');
});

test('pré-carrega itens extras na abertura quando includeExtras está ativo', async () => {
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map(),
    items: new Map([
      ['caixa', { id: 'caixa', category: 'missao', imageUrl: './story/items/caixa.png' }],
      ['disquete', { id: 'disquete', category: 'extra', imageUrl: './story/items/disquete.png' }],
      ['caneca', { id: 'caneca', category: 'extra', imageUrl: './story/items/caneca.png' }],
    ]),
    missions: [
      { id: 'm1', giveItem: 'caixa', requireItem: null, introCutscene: null, outroCutscene: null },
    ],
  };

  const preloadedUrls = new Set();
  const summary = await preloadMissionAssets(story, 0, {
    includeSplash: false,
    includeExtras: true,
    preloadedUrls,
    loadImageFn: async () => true,
  });

  assert.equal(summary.total, 3);
  assert.equal(preloadedUrls.has('./story/items/disquete.png'), true);
  assert.equal(preloadedUrls.has('./story/items/caneca.png'), true);
});

test('registra arquivos já carregados em memória e evita recarregamento desnecessário', async () => {
  clearLoadedAssets();
  const story = {
    splashUrl: './story/splash.png',
    characters: new Map([
      ['guanabara', { id: 'guanabara', sprites: { right: './story/characters/guanabara.png' } }],
    ]),
    items: new Map(),
    missions: [],
  };

  let fetchCount = 0;
  const first = await preloadStoryAssets(story, {
    loadImageFn: async () => {
      fetchCount += 1;
      return true;
    },
  });
  assert.equal(first.total, 2);
  assert.equal(fetchCount, 2);
  assert.equal(isAssetLoaded('./story/splash.png'), true);
  assert.equal(isAssetLoaded('./story/characters/guanabara.png'), true);

  // Segunda chamada sem Set explícito ainda evita recarregar os já registrados em memória
  const second = await preloadStoryAssets(story, {
    loadImageFn: async () => {
      fetchCount += 1;
      return true;
    },
  });
  assert.equal(second.total, 0);
  assert.equal(fetchCount, 2);
  clearLoadedAssets();
});

test('parseNpcLinesMarkdown lê falas de NPCs de story/npc-lines.md ignorando cabeçalhos e marcadores', () => {
  const sampleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../story');
  const raw = fs.readFileSync(path.join(sampleDir, 'npc-lines.md'), 'utf-8');
  const lines = parseNpcLinesMarkdown(raw);
  assert.ok(lines.length >= 15, `esperado >= 15 falas, obtido ${lines.length}`);
  assert.ok(lines.every((l) => l.length > 0 && l.length <= 60 && !l.startsWith('#') && !l.startsWith('- ')));

  const filtered = parseNpcLinesMarkdown(`- Mensagem curta\n- ${'a'.repeat(61)}\n`);
  assert.deepEqual(filtered, ['Mensagem curta']);

  const wrongRaw = fs.readFileSync(path.join(sampleDir, 'wrong-item-lines.md'), 'utf-8');
  const wrongLines = parseNpcLinesMarkdown(wrongRaw);
  assert.ok(wrongLines.length >= 5, `esperado >= 5 falas de item errado, obtido ${wrongLines.length}`);
  assert.ok(wrongLines.every((l) => l.length > 0 && l.length <= 60));
});

test('parseMissionMarkdown interpreta diretiva - LINK: com rótulo personalizado e padrão "Visualizar o link"', () => {
  const md = `---
id: m-link
title: Teste Link
start: RUA-01-01
target: COM-01-01
---
## CUTSCENE_INICIO
left: prota
right: mentor
bg: RUA
- prota: Olha esse site aqui!
- LINK: Acessar Curso -> https://www.cursoemvideo.com/
- mentor: Também tem esse outro endereço.
- LINK: https://www.cursoemvideo.com/cursos
`;
  const mission = parseMissionMarkdown(md, 'm-link.md');
  assert.equal(mission.introCutscene.steps.length, 2);
  assert.deepEqual(mission.introCutscene.steps[0].link, {
    label: 'Acessar Curso',
    url: 'https://www.cursoemvideo.com/',
  });
  assert.deepEqual(mission.introCutscene.steps[1].link, {
    label: 'Ver el enlace',
    url: 'https://www.cursoemvideo.com/cursos',
  });
});

test('parseMissionMarkdown rejeita - LINK: inválido, protocolo proibido ou sem fala anterior', () => {
  const baseHeader = `---
id: m-link-err
title: Erro Link
start: RUA-01-01
target: COM-01-01
---
## CUTSCENE_INICIO
left: prota
right: mentor
`;

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- prota: Fala\n- LINK: Clique -> javascript:alert(1)\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- prota: Fala\n- LINK: Clique -> url-invalida\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseMissionMarkdown(
        `${baseHeader}- LINK: Sem fala -> https://www.cursoemvideo.com/\n`,
        'm-link-err.md',
      ),
    StoryParseError,
  );
});

test('parseEncounterMarkdown lê encontro extra em construção e rejeita local não edificável', () => {
  const map = new CityMap();
  const sampleDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../story');
  const raw = fs.readFileSync(path.join(sampleDir, 'missions/extra-cuartel-hacker.md'), 'utf-8');
  const encounter = parseEncounterMarkdown(raw, 'missions/extra-cuartel-hacker.md', map);

  assert.equal(encounter.id, 'extra-cuartel-hacker');
  assert.ok(encounter.npc);
  assert.equal(encounter.location, 'CASA-63');
  assert.match(encounter.roofColor, /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  assert.ok(encounter.cutscene.steps.length >= 2);

  const defaultEncounter = parseEncounterMarkdown(
    `---\nid: def\nnpc: maltmon\nlocation: CASA-63\n---\n## CUTSCENE\n- maltmon: Oi\n`,
    'def.md',
    map,
  );
  assert.equal(defaultEncounter.roofColor, '#d6282e');
  assert.equal(defaultEncounter.roofLogo, '');

  const customEncounter = parseEncounterMarkdown(
    `---\nid: custom\nnpc: maltmon\nlocation: CASA-63\nroof_color: #2563eb\nroof_logo: assets/alex-front.svg\n---\n## CUTSCENE\n- maltmon: Oi\n`,
    'custom.md',
    map,
  );
  assert.equal(customEncounter.roofColor, '#2563eb');
  assert.equal(customEncounter.roofLogo, 'assets/alex-front.svg');

  assert.throws(
    () =>
      parseEncounterMarkdown(
        `---\nid: badcolor\nnpc: maltmon\nlocation: CASA-63\nroof_color: azul\n---\n## CUTSCENE\n- maltmon: Oi\n`,
        'badcolor.md',
        map,
      ),
    StoryParseError,
  );

  assert.throws(
    () =>
      parseEncounterMarkdown(
        `---\nid: bad\nnpc: maltmon\nlocation: RUA-04\n---\n## CUTSCENE\n- maltmon: Oi\n`,
        'bad.md',
        map,
      ),
    StoryParseError,
  );
});
