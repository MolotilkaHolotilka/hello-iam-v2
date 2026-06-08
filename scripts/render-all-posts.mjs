import fs from 'node:fs/promises';
import path from 'node:path';

const API = 'http://localhost:4242';
const OUT_LOG = path.join(process.cwd(), 'render-all-results.json');

const POSTS = [
  {
    postId: '010',
    accent: 'FOOD',
    quotes: [
      'Start with bread. Lavash is foundation, gesture, and memory.',
      'Then dairy and calm. Matsun sits quietly at the center of the table.',
      'Then shared dishes. Dolma, herbs, and plates made for passing.',
      'Then fruit and drink. Apricot and wine carry season, table, and time.',
      'This is not a menu. It is a food memory map.',
    ],
  },
  {
    postId: '011',
    accent: 'CULTURE',
    quotes: [
      'Memory in stone. Khachkars hold form, faith, and time.',
      'Heat and making. Tonir is ritual, craft, and daily life.',
      'Speech and gathering. Toasts and weddings turn words into structure.',
      'Everyday symbols. Backgammon, fountains, gestures, repetition.',
      'Culture here is not abstract. It is used, touched, spoken, and repeated.',
    ],
  },
  {
    postId: '012',
    accent: 'STREETS',
    quotes: [
      'In Yerevan, a courtyard is not a gap between buildings. It is where the neighbourhood actually lives.',
      'Each balcony belongs to a different life. Stacked, layered, and slightly improvised.',
      'Garage doors, elevator buttons, patched walls. Every repair is a small signature of the city.',
      'At the end of the day, ordinary stone and plaster start to hold the light differently.',
      'This is the part of Armenia that takes the longest to leave.',
    ],
  },
  {
    postId: '013',
    accent: 'OBJECTS',
    quotes: [
      'The Armenian coffee pot — called a jazve — is not just a vessel. It is the object around which a specific kind of morning patience was built.',
      'A cassette player in an Armenian home from the 1980s or 90s holds not just music but the exact texture of the time it came from.',
      'The market scale is still in use across Armenian bazaars. It is a measuring instrument and a performance of trust at the same time.',
      'A wine glass, a kitchen knife, a hand-painted tile. Small objects. Each one a key to something larger.',
      'Objects are readable because they were used. That is the difference between a cultural key and a souvenir.',
    ],
  },
  {
    postId: '014',
    accent: 'SOUNDS',
    quotes: [
      "A church bell doesn't just mark the hour. It sets the emotional register of the whole street.",
      "An Armenian market doesn't have background noise. It has a score.",
      'A radio on a shelf holds more than music. It holds the memory of everyone who listened before you.',
      'A glass placed on a table. Backgammon pieces landing. The table has its own acoustic grammar.',
      'When you can hear a place, you have started to know it.',
    ],
  },
  {
    postId: '100',
    accent: 'LAVASH',
    quotes: [
      'Lavash is made pressed against the inner wall of a tonir — a clay oven dug into the ground. The heat is fast, the bread is ready in seconds.',
      'Dry lavash is not stale lavash. A few drops of water bring it back completely. It is designed to wait.',
      'At Armenian weddings, lavash is placed on the shoulders of the bride and groom. It means abundance. It means the bread will always be there.',
      'Lavash wraps cheese, herbs, and meat the way other cultures use plates. It is edible packaging, and it has been for thousands of years.',
      'One bread. Made in fire. Revived with water. Carried at weddings. Wrapped around everything. That is lavash.',
    ],
  },
  {
    postId: '102',
    accent: 'DOLMA',
    quotes: [
      'Dolma starts as a pile of grape leaves and filling. The dish only exists after every piece has been rolled by hand.',
      'In most Armenian kitchens, dolma is not made alone. It is made in groups, with each person rolling at their own pace.',
      'There is no definitive dolma. Grape leaves, cabbage leaves, or stuffed peppers and aubergines — all of them count.',
      'Dolma is almost always served with matsun. The cool dairy against the warm filling is not a suggestion. It is the point.',
      'After the table is cleared, the grape leaves and bowl and cloth tell you exactly what happened here.',
    ],
  },
  {
    postId: '103',
    accent: 'WINE',
    quotes: [
      'The Areni-1 cave in Armenia contains the oldest known winery in the world — over 6,000 years old. The vine was here long before the label.',
      'Armenian wine is not cellared and discussed. It is opened and shared. The table is where it belongs.',
      'Pouring for someone else before yourself is not etiquette. It is how the ritual works.',
      'A glass and a bottle. No occasion required. The objects themselves are enough to begin.',
      'The glass empties. The table remembers. That is what wine is for here.',
    ],
  },
  {
    postId: '104',
    accent: 'GREEN PLATE',
    quotes: [
      'The green plate is not a side dish. It is coriander, tarragon, basil, spring onion, and mint — fresh, whole, and present at every single meal.',
      'You pick from it throughout the meal. A leaf of tarragon with cheese. A handful of coriander with lavash. The plate never really empties before it is refilled.',
      'Hands reach into it without thinking. That is the point. The green plate does not ask to be noticed — it is just always within reach.',
      'Every Armenian table has one. Breakfast, lunch, dinner. Regardless of what else is served, the herbs are there.',
      'The green plate is not a memory. It is on the table right now.',
    ],
  },
  {
    postId: '105',
    accent: 'APRICOT',
    quotes: [
      "The apricot tree has been growing in this region for thousands of years. Armenia's Latin name — Prunus armeniaca — means Armenian plum. The fruit named a country.",
      'Apricot harvest happens in June and July. Hands pick each fruit individually. The knowledge of when it is ready lives in touch, not in a calendar.',
      'The colour has a name in Armenian — dziraní. It is the exact orange of a ripe apricot at the moment before it falls from the tree.',
      'Armenian apricots taste different from any other. Sweeter, more aromatic, with a sharpness underneath. Once you know the taste, you always recognise it.',
      'What cannot be eaten fresh is dried or preserved. Dried apricot turns amber — summer held in stone-coloured fruit that lasts through winter.',
    ],
  },
  {
    postId: '402',
    accent: 'CASSETTE\nPLAYER',
    label: 'AM CASSETTE PLAYER',
    quoteLabel: 'I AM _ CASSETTE PLAYER',
    quotes: [
      'Inside a cassette, the tape is 90 or 120 metres of magnetic ribbon coated with iron oxide. Every song is a physical mark on that ribbon. You can hold the music in your hands.',
      'Loading a cassette is a deliberate act. You choose a tape, you put it in, you press play. There is no recommendation. Only your decision.',
      'Cassette sound is warm because the tape slightly compresses the signal. The imperfection is not a flaw — it is part of how the music feels.',
      'It was in the bedroom, the kitchen, the car. Not a device for occasions — a device for every day. A constant presence that played what you needed.',
      'A cassette player is not nostalgia. It is a voice saying: this mattered, this was important, this is who I was. And sometimes — this is still who I am.',
    ],
  },
  {
    postId: '701',
    accent: 'DILIJAN',
    quotes: [
      'Dilijan sits inside the Dilijan National Park — 28,000 hectares of oak, beech, and hornbeam forest. The town is not near the forest. It is inside it.',
      "The Aghstev river runs through Dilijan. Cold, clear, and fast. The sound of running water is the town's permanent background.",
      'Dilijan has been a cultural retreat since the Soviet era. Composers, writers, and filmmakers came here to work. The buildings remember them.',
      'At certain times of year, Dilijan is almost empty. The quiet is not absence — it is the point. The forest fills the space differently from people.',
      'Dilijan is where Armenia goes to heal. Not from sickness — from noise, from performance, from the weight of remembering. Here you can just breathe.',
    ],
  },
];

function buildContent(post) {
  const id = post.postId;
  const accent = post.accent;
  const label = post.label || `AM ${accent.replace(/\n/g, ' ')}`;
  const quoteLabel = post.quoteLabel || `I AM _ ${accent.replace(/\n/g, ' ')}`;
  const cards = [
    {
      title: 'HELLO,\nI AM',
      titleAccent: accent,
      label,
      image: `posts/${id}/${id}_1.png`,
      background: '#d61e23',
      titleColor: '#ffffff',
      accentColor: '#ffce1f',
    },
    ...post.quotes.map((quote, idx) => ({
      title: quoteLabel,
      image: `posts/${id}/${id}_${idx + 2}.png`,
      quote,
      label,
      background: '#d9dde0',
      quoteColor: '#d61e23',
    })),
    {
      brandLeft: 'helloiam',
      brandRight: 'am',
      image: `posts/${id}/${id}_emoji.png`,
      background: '#d9dde0',
      brandColor: '#420000',
    },
  ];
  return { item: `${id}-i-am-${accent.toLowerCase().replace(/\s+/g, '-').replace(/\n/g, '-')}`, cards };
}

async function loadTemplate() {
  const res = await fetch(`${API}/api/templates`);
  const json = await res.json();
  const tpl = json.templates.find((t) => t.id === 'i-am-7-cards');
  if (!tpl) throw new Error('Template i-am-7-cards not found');
  return tpl;
}

async function renderOne(template, post) {
  const content = buildContent(post);
  const body = {
    templateId: 'i-am-7-cards',
    templateName: template.name,
    exportName: template.workflow?.exportName || 'Template',
    mapping: template.mappingExample,
    content,
    workflow: template.workflow,
    animationPreset: 'clean-rise',
  };
  console.log(`\n[${post.postId}] starting render...`);
  const startedAt = Date.now();
  const res = await fetch(`${API}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const elapsedMs = Date.now() - startedAt;
  const payload = await res.json();
  if (!res.ok) {
    console.error(`[${post.postId}] FAILED in ${(elapsedMs / 1000).toFixed(1)}s:`, payload);
    return { postId: post.postId, ok: false, error: payload, elapsedMs };
  }
  console.log(`[${post.postId}] OK in ${(elapsedMs / 1000).toFixed(1)}s, runId=${payload.runId}`);
  return {
    postId: post.postId,
    accent: post.accent.replace(/\n/g, ' '),
    ok: true,
    runId: payload.runId,
    elapsedMs,
    files: payload.files,
    links: payload.links,
  };
}

async function main() {
  console.log(`Rendering ${POSTS.length} posts via ${API}`);
  const template = await loadTemplate();
  console.log(`Loaded template: ${template.id}`);
  const results = [];
  for (const post of POSTS) {
    try {
      const r = await renderOne(template, post);
      results.push(r);
    } catch (error) {
      console.error(`[${post.postId}] threw:`, error.message);
      results.push({ postId: post.postId, ok: false, error: error.message });
    }
    await fs.writeFile(OUT_LOG, JSON.stringify(results, null, 2));
  }
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  console.log(`\n=== DONE: ${ok} succeeded, ${fail} failed ===`);
  console.log(`Results saved to: ${OUT_LOG}`);
}

main().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
