export function renderMvpNav(active = "render") {
  const root = document.getElementById("mvp-top-nav");
  if (!root) return;

  root.innerHTML = `
    <a href="/" class="mvp-top-nav-link${active === "render" ? " is-active" : ""}">Render</a>
    <a href="/dev.html" class="mvp-top-nav-link${active === "dev" ? " is-active" : ""}">_dev</a>
    <a href="/assets.html" class="mvp-top-nav-link${active === "assets" ? " is-active" : ""}">Template assets</a>
  `;
}
