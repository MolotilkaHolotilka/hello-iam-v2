export const FEED_RUBRICS = [
  {
    name: "First Hello",
    code: "001",
    rules: [
      "Identity-first framing",
      "Short narrative arc",
      "Foundational tone for account voice"
    ]
  },
  {
    name: "Category Map",
    code: "002",
    rules: [
      "Object/category-based storytelling",
      "One concept per slide",
      "Clear taxonomy and progression"
    ]
  },
  {
    name: "Deep Dive",
    code: "003",
    rules: [
      "Research-backed specificity",
      "Context + detail + takeaway",
      "Stronger documentary voice"
    ]
  },
  {
    name: "Objects Of Armenia",
    code: "004",
    rules: [
      "Single-object focus",
      "Museum-catalog clarity",
      "Five sharp observations over broad history"
    ]
  },
  {
    name: "Street Feelings",
    code: "005",
    rules: [
      "Atmosphere over explanation",
      "Urban traces and ordinary details",
      "Lived-in pacing and mood"
    ]
  },
  {
    name: "Rituals And Habits",
    code: "006",
    rules: [
      "Behavior-first framing",
      "Show use, repetition, and social logic",
      "Observe without over-explaining"
    ]
  },
  {
    name: "Sounds Of Armenia",
    code: "007",
    rules: [
      "Audio-memory framing",
      "Sound source plus atmosphere plus context",
      "Reel-first rhythm with visual restraint"
    ]
  },
  {
    name: "People / Archetypes",
    code: "008",
    rules: [
      "Character through behavior, not biography",
      "Keep subject inside the world",
      "Documentary, not host-led"
    ]
  },
  {
    name: "Things Armenians Don't Think Are Weird",
    code: "009",
    rules: [
      "Humor through specificity",
      "Relatable list-based pacing",
      "Warm, observant, never mocking"
    ]
  },
  {
    name: "Seasonal Signals",
    code: "010",
    rules: [
      "Time-and-mood led storytelling",
      "Use seasonal objects and atmospheres",
      "Keep the brand voice stable while the scenery shifts"
    ]
  }
];

export const STORY_RUBRICS = [
  {
    name: "Story: Closer Look",
    code: "S01",
    rules: [
      "Zoom into one detail from the world",
      "Extend recognition from a feed post",
      "Detail-first sequence with minimal text"
    ]
  },
  {
    name: "Story: Ask / Answer",
    code: "S02",
    rules: [
      "Audience response as worldbuilding",
      "Simple interaction with low friction",
      "Use replies to sort taste and curiosity"
    ]
  },
  {
    name: "Story: Tiny Worldbuilding",
    code: "S03",
    rules: [
      "Keep the account alive between bigger posts",
      "Use fragments that still feel on-brand",
      "Small signal, strong visual consistency"
    ]
  }
];

export const FEED_RUBRIC_ORDER = Object.fromEntries(
  FEED_RUBRICS.map(({ name, code }) => [name, code])
);

export const STORY_RUBRIC_ORDER = Object.fromEntries(
  STORY_RUBRICS.map(({ name, code }) => [name, code])
);

export const RUBRIC_ORDER = {
  ...FEED_RUBRIC_ORDER,
  ...STORY_RUBRIC_ORDER
};

const RUBRIC_RULES = Object.fromEntries(
  [...FEED_RUBRICS, ...STORY_RUBRICS].map(({ name, rules }) => [name, rules])
);

export function getRubricRules(rubric) {
  return RUBRIC_RULES[rubric] || ["Keep editorial tone", "Avoid generic stock language"];
}

export function getRubricSortCode(rubric) {
  return RUBRIC_ORDER[rubric] || "999";
}

export function getRubricDisplayLabel(rubric) {
  const code = getRubricSortCode(rubric);
  return `${code} - ${rubric}`;
}

export function sortRubrics(rubrics) {
  return [...rubrics].sort((a, b) => {
    const aCode = getRubricSortCode(a);
    const bCode = getRubricSortCode(b);
    if (aCode === bCode) return a.localeCompare(b);
    return aCode.localeCompare(bCode);
  });
}
