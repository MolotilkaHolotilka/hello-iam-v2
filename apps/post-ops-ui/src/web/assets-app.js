import { renderMvpNav } from "./mvp-nav.js";

const state = { templates: [], assets: null };

const $ = (id) => document.getElementById(id);

function setStatus(message, tone = "neutral") {
  const box = $("assets-status");
  box.dataset.tone = tone;
  box.textContent = message;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type") || "";
  const raw = await response.text();
  let payload = {};
  if (contentType.includes("application/json")) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("Invalid JSON from server");
    }
  } else if (raw.trim().startsWith("<")) {
    throw new Error(
      "Server returned HTML instead of JSON. Restart post-ops-ui (npm run dev) and try again."
    );
  } else if (raw.trim()) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new Error("Unexpected response from server");
    }
  }
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload;
}

function selectedTemplateId() {
  return $("assets-template-select").value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAssetList(bucket, files) {
  const list = $(`${bucket}-list`);
  const hint = $(`${bucket}-path-hint`);
  const templateId = selectedTemplateId();

  hint.textContent = templateId
    ? `Use in Content JSON: templates/${templateId}/${bucket}/<filename>`
    : "";

  if (!files.length) {
    list.innerHTML = `<li class="mvp-assets-empty">No files yet. Upload images here.</li>`;
    return;
  }

  list.innerHTML = files
    .map(
      (file) => `
    <li class="mvp-assets-item">
      <a class="mvp-assets-thumb-link" href="/assets/${escapeHtml(file.path)}" target="_blank" rel="noreferrer">
        <img src="/assets/${escapeHtml(file.path)}" alt="" />
      </a>
      <div class="mvp-assets-meta">
        <code class="mvp-assets-path">${escapeHtml(file.path)}</code>
        <div class="mvp-assets-actions">
          <button type="button" data-copy-path="${escapeHtml(file.path)}">Copy path</button>
          <button type="button" data-delete-asset="${bucket}" data-file-name="${escapeHtml(file.name)}">Delete</button>
        </div>
      </div>
    </li>
  `
    )
    .join("");
}

function renderAssets(assets) {
  state.assets = assets;
  renderAssetList("images", assets.images || []);
  renderAssetList("stickers", assets.stickers || []);
  $("assets-template-hint").textContent = assets.templateId
    ? `Assets for “${assets.templateId}” only. Render rejects paths outside templates/${assets.templateId}/images|stickers/.`
    : "Select a template.";
}

async function loadAssets(templateId) {
  if (!templateId) return;
  setStatus("Loading assets…", "loading");
  const assets = await requestJson(`/api/templates/${encodeURIComponent(templateId)}/assets`);
  renderAssets(assets);
  setStatus("Ready", "success");
}

async function loadTemplates() {
  const payload = await requestJson("/api/templates");
  state.templates = payload.templates || [];
  $("assets-template-select").innerHTML = state.templates
    .map((template) => `<option value="${escapeHtml(template.id)}">${escapeHtml(template.name || template.id)}</option>`)
    .join("");

  if (!state.templates.length) {
    setStatus("No templates found", "error");
    return;
  }

  const fromQuery = new URLSearchParams(window.location.search).get("template");
  if (fromQuery && state.templates.some((item) => item.id === fromQuery)) {
    $("assets-template-select").value = fromQuery;
  }

  await loadAssets(selectedTemplateId());
}

async function uploadFiles(bucket, fileList) {
  const templateId = selectedTemplateId();
  if (!templateId || !fileList?.length) return;

  const form = new FormData();
  Array.from(fileList).forEach((file) => form.append("files", file));

  setStatus(`Uploading to ${bucket}…`, "loading");
  const payload = await requestJson(
    `/api/templates/${encodeURIComponent(templateId)}/assets/${bucket}`,
    { method: "POST", body: form }
  );
  renderAssets(payload.assets);
  setStatus(`Uploaded ${payload.uploaded?.length || 0} file(s)`, "success");
}

async function deleteAsset(bucket, fileName) {
  const templateId = selectedTemplateId();
  if (!templateId || !fileName) return;
  if (!window.confirm(`Delete ${fileName}?`)) return;

  setStatus("Deleting…", "loading");
  await requestJson(
    `/api/templates/${encodeURIComponent(templateId)}/assets/${bucket}/${encodeURIComponent(fileName)}`,
    { method: "DELETE" }
  );
  await loadAssets(templateId);
  setStatus("Deleted", "success");
}

function wireEvents() {
  $("assets-template-select").addEventListener("change", () => {
    const templateId = selectedTemplateId();
    const url = new URL(window.location.href);
    url.searchParams.set("template", templateId);
    window.history.replaceState({}, "", url);
    loadAssets(templateId).catch((error) => setStatus(error.message, "error"));
  });

  $("upload-images").addEventListener("change", (event) => {
    uploadFiles("images", event.target.files).catch((error) => setStatus(error.message, "error"));
    event.target.value = "";
  });

  $("upload-stickers").addEventListener("change", (event) => {
    uploadFiles("stickers", event.target.files).catch((error) => setStatus(error.message, "error"));
    event.target.value = "";
  });

  document.body.addEventListener("click", async (event) => {
    const copyBtn = event.target.closest("[data-copy-path]");
    if (copyBtn) {
      await navigator.clipboard.writeText(copyBtn.dataset.copyPath);
      setStatus("Path copied to clipboard", "success");
      return;
    }

    const deleteBtn = event.target.closest("[data-delete-asset]");
    if (deleteBtn) {
      deleteAsset(deleteBtn.dataset.deleteAsset, deleteBtn.dataset.fileName).catch((error) =>
        setStatus(error.message, "error")
      );
    }
  });
}

renderMvpNav("assets");
wireEvents();
loadTemplates().catch((error) => setStatus(error.message, "error"));
