export function defaultDraft() {
  return {
    copy: {
      title: "",
      oneLineThesis: "",
      slides: [],
      caption: "",
      cta: ""
    },
    prompts: {
      coverPrompt: "",
      slidePrompts: []
    }
  };
}

export function defaultGeneration() {
  return {
    lastRunId: null,
    lastStep: null,
    variants: []
  };
}

export function defaultEditorial() {
  return {
    tone: "editorial",
    audience: "instagram",
    constraints: []
  };
}

export function withCmsDefaults(post) {
  return {
    visualFormat: "standard carousel",
    ...post,
    draft: {
      ...defaultDraft(),
      ...(post?.draft || {}),
      copy: {
        ...defaultDraft().copy,
        ...(post?.draft?.copy || {})
      },
      prompts: {
        ...defaultDraft().prompts,
        ...(post?.draft?.prompts || {})
      }
    },
    generation: {
      ...defaultGeneration(),
      ...(post?.generation || {})
    },
    editorial: {
      ...defaultEditorial(),
      ...(post?.editorial || {})
    }
  };
}
