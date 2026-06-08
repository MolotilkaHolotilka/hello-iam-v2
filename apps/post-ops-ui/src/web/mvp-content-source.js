const CONTENT_KEY = "mvp:contentJson";
const LABEL_KEY = "mvp:contentFileLabel";
const TEMPLATE_KEY = "mvp:templateId";

export function createContentSource(initialValue = "") {
  let value = sessionStorage.getItem(CONTENT_KEY) ?? initialValue;

  return {
    getValue: () => value,
    setValue: (next) => {
      value = next;
      try {
        sessionStorage.setItem(CONTENT_KEY, next);
      } catch (_) {}
    }
  };
}

export function getStoredContentLabel() {
  return sessionStorage.getItem(LABEL_KEY);
}

export function setStoredContentLabel(label) {
  if (label) {
    sessionStorage.setItem(LABEL_KEY, label);
  } else {
    sessionStorage.removeItem(LABEL_KEY);
  }
}

export function hasStoredContent() {
  return sessionStorage.getItem(CONTENT_KEY) !== null;
}

export function getStoredTemplateId() {
  return sessionStorage.getItem(TEMPLATE_KEY);
}

export function setStoredTemplateId(id) {
  if (id) {
    sessionStorage.setItem(TEMPLATE_KEY, id);
  } else {
    sessionStorage.removeItem(TEMPLATE_KEY);
  }
}
