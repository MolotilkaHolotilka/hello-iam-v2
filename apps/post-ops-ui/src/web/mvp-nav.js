const MVP_NAV_LINKS = [
  { id: "render", href: "/", label: "Render" },
  { id: "import", href: "/import.html", label: "Import" },
  { id: "dev", href: "/dev.html", label: "_dev" },
  { id: "assets", href: "/assets.html", label: "Template assets" },
];

export function renderMvpNav(active = "render") {
  const root = document.getElementById("mvp-top-nav");
  if (!root) return;

  root.innerHTML = MVP_NAV_LINKS.map(({ id, href, label }) => {
    const isActive = active === id;
    return `<a href="${href}" class="mvp-top-nav-link${isActive ? " is-active" : ""}"${
      isActive ? ' aria-current="page"' : ""
    }>${label}</a>`;
  }).join("");
}
