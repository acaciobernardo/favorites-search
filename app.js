let favorites = [];
let history = [];
const searchInput = document.querySelector("#search");
const results = document.querySelector("#results");
const status = document.querySelector("#status");
const clearButton = document.querySelector("#clear");
const googleSearchButton = document.querySelector("#google-search");
const shortcutGrid = document.querySelector("#shortcut-grid");
const shortcutModal = document.querySelector("#shortcut-modal");
const shortcutForm = document.querySelector("#shortcut-form");
const shortcutUrlInput = document.querySelector("#shortcut-url");
const shortcutError = document.querySelector("#shortcut-error");
const shortcutMenu = document.querySelector("#shortcut-menu");
const renameShortcutButton = document.querySelector("#rename-shortcut");
const removeShortcutButton = document.querySelector("#remove-shortcut");
const renameModal = document.querySelector("#rename-modal");
const renameForm = document.querySelector("#rename-form");
const shortcutTitleInput = document.querySelector("#shortcut-title-input");
const renameError = document.querySelector("#rename-error");
const DESCRIPTIONS_KEY = "pageDescriptions";
const MAX_DESCRIPTION = 255;
const MAX_RESULTS = 60;
const VISIBLE_GROUP_ITEMS = 3;
const RETRY_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
let descriptions = {};
const expandedGroups = new WeakMap();
let selectedShortcut = null;
let renameTarget = null;
const favoriteModal = document.querySelector("#favorite-modal");
const favoriteForm = document.querySelector("#favorite-form");
const favoriteUrlInput = document.querySelector("#favorite-url");
const favoriteError = document.querySelector("#favorite-error");
const ORGANIZED_ROOT = "Organizados";

function normalize(value) {
  return String(value || "").toLocaleLowerCase("pt-PT").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function flattenFavorites(node, output = [], folder = "") {
  if (Array.isArray(node)) {
    node.forEach(child => flattenFavorites(child, output, folder));
    return output;
  }
  if (!node || typeof node !== "object") return output;
  if (node.url) output.push({ title: node.title || node.url, url: node.url, folder });
  const nextFolder = node.title ? (folder ? `${folder} / ${node.title}` : node.title) : folder;
  (node.children || []).forEach(child => flattenFavorites(child, output, nextFolder));
  return output;
}

function findBookmarkBar(node) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findBookmarkBar(child);
      if (match) return match;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  if (
    node.id === "bookmark_bar" ||
    /^(bookmark bar|favorites bar|barra de favoritos|barra de favoritos edge)$/i.test(node.title || "")
  ) return node;
  for (const child of node.children || []) {
    const match = findBookmarkBar(child);
    if (match) return match;
  }
  return null;
}

function findFolderByTitle(node, title) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findFolderByTitle(child, title);
      if (match) return match;
    }
    return null;
  }
  if (!node || typeof node !== "object") return null;
  if (!node.url && node.title === title) return node;
  for (const child of node.children || []) {
    const match = findFolderByTitle(child, title);
    if (match) return match;
  }
  return null;
}

async function getShortcutsFolder(tree) {
  const existingFolder = findFolderByTitle(tree, "favorites-search");
  if (existingFolder) return existingFolder;
  const bookmarkBar = findBookmarkBar(tree);
  if (!bookmarkBar) return null;
  return chrome.bookmarks.create({
    parentId: bookmarkBar.id,
    title: "favorites-search"
  });
}

function openShortcutModal() {
  shortcutError.textContent = "";
  shortcutUrlInput.value = "";
  shortcutModal.classList.remove("hidden");
  shortcutUrlInput.focus();
}

function closeShortcutModal() {
  shortcutModal.classList.add("hidden");
}

function closeShortcutMenu() {
  shortcutMenu.classList.add("hidden");
  selectedShortcut = null;
}

function openRenameModal() {
  if (!selectedShortcut) return;
  renameTarget = selectedShortcut;
  shortcutTitleInput.value = renameTarget.title || "";
  renameError.textContent = "";
  closeShortcutMenu();
  renameModal.classList.remove("hidden");
  shortcutTitleInput.focus();
}

function closeRenameModal() {
  renameModal.classList.add("hidden");
}

function getShortcutIconSources(item, faviconUrl) {
  if (faviconUrl.hostname.endsWith("kelio.io")) {
    const kelioIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#fff"/>
        <ellipse cx="32" cy="32" rx="14" ry="24" fill="#111"/>
        <path d="M32 8c-7 7-7 41 0 48 7-7 7-41 0-48z" fill="#ffd400"/>
        <path d="M32 8c4 9 4 39 0 48" fill="none" stroke="#111" stroke-width="3"/>
      </svg>`;
    return [`data:image/svg+xml,${encodeURIComponent(kelioIcon)}`];
  }
  if (faviconUrl.hostname === "pagim.mapfre.rede") {
    const mapfreIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect width="64" height="64" rx="14" fill="#f50946"/>
        <path d="M17 28c5-8 11-8 15 0 4-8 10-8 15 0-5 9-10 13-15 13S22 37 17 28z" fill="#fff"/>
        <path d="M25 42c5 3 9 3 14 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    return [`data:image/svg+xml,${encodeURIComponent(mapfreIcon)}`];
  }
  return [
    `${faviconUrl.origin}/favicon.ico`,
    `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(item.url)}&sz=64`,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(faviconUrl.hostname)}.ico`
  ];
}

function renderShortcuts(items) {
  shortcutGrid.replaceChildren();
  items.slice(0, 19).forEach(item => {
    const link = document.createElement("a");
    link.className = "shortcut";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.title = item.title || item.url;
    link.addEventListener("contextmenu", event => {
      event.preventDefault();
      selectedShortcut = item;
      shortcutMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 140)}px`;
      shortcutMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 55)}px`;
      shortcutMenu.classList.remove("hidden");
    });

    const icon = document.createElement("span");
    icon.className = "shortcut-icon";
    const fallbackLetter = (item.title || item.url).charAt(0).toUpperCase();
    const faviconUrl = new URL(item.url);
    const image = document.createElement("img");
    image.alt = "";
    const faviconSources = getShortcutIconSources(item, faviconUrl);
    let faviconSourceIndex = 0;
    image.addEventListener("error", () => {
      if (faviconSourceIndex < faviconSources.length - 1) {
        faviconSourceIndex += 1;
        image.src = faviconSources[faviconSourceIndex];
        return;
      }
      image.remove();
      icon.textContent = fallbackLetter;
    });
    image.src = faviconSources[0];
    icon.appendChild(image);

    const title = document.createElement("span");
    title.className = "shortcut-title";
    title.textContent = item.title || item.url;
    link.append(icon, title);
    shortcutGrid.appendChild(link);
  });

  const addButton = document.createElement("button");
  addButton.className = "shortcut shortcut-add";
  addButton.type = "button";
  addButton.title = "Adicionar atalho";
  addButton.innerHTML = '<span class="shortcut-icon" aria-hidden="true">+</span><span class="shortcut-title">Adicionar atalho</span>';
  addButton.addEventListener("click", openShortcutModal);
  shortcutGrid.appendChild(addButton);
}

function getDescription(url) {
  return descriptions[url]?.text || "";
}

function stripQuery(url) {
  return url.split(/[?#]/)[0];
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function findMatches(items, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return items.slice(0, MAX_RESULTS);
  return items.filter(item => {
    const haystack = normalize(`${item.title} ${item.url} ${item.folder || ""} ${getDescription(item.url)}`);
    return terms.every(term => haystack.includes(term));
  }).slice(0, MAX_RESULTS);
}

function extractDescription(doc) {
  const selectors = [
    'meta[name="description" i]',
    'meta[property="og:description" i]',
    'meta[name="twitter:description" i]'
  ];
  for (const selector of selectors) {
    const content = doc.querySelector(selector)?.getAttribute("content")?.replace(/\s+/g, " ").trim();
    if (content) return content.slice(0, MAX_DESCRIPTION);
  }
  return "";
}

async function fetchDescription(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { credentials: "include", signal: controller.signal });
    if (!response.ok || !/html/i.test(response.headers.get("content-type") || "")) return "";
    const html = (await response.text()).slice(0, 300000);
    return extractDescription(new DOMParser().parseFromString(html, "text/html"));
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

async function saveDescriptions() {
  try {
    await chrome.storage.local.set({ [DESCRIPTIONS_KEY]: descriptions });
  } catch (error) {
    console.error(error);
  }
}

let descriptionsJob = null;
async function loadMissingDescriptions(items) {
  const now = Date.now();
  const pending = [...new Set(items.map(item => item.url))].filter(url => {
    const entry = descriptions[url];
    return !entry || (!entry.text && now - entry.checked > RETRY_AFTER_MS);
  });
  if (!pending.length || descriptionsJob) return;
  let done = 0;
  const worker = async () => {
    while (pending.length) {
      const url = pending.shift();
      descriptions[url] = { text: await fetchDescription(url), checked: Date.now() };
      done += 1;
      if (done % 10 === 0) {
        await saveDescriptions();
        render();
      }
    }
  };
  descriptionsJob = Promise.all(Array.from({ length: 4 }, worker)).then(async () => {
    await saveDescriptions();
    descriptionsJob = null;
    render();
  });
}

function parseTitle(doc) {
  const og = doc.querySelector('meta[property="og:title" i]')?.getAttribute("content");
  return (og || doc.querySelector("title")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 150);
}

async function fetchPageInfo(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { credentials: "include", signal: controller.signal });
    if (!response.ok || !/html/i.test(response.headers.get("content-type") || "")) return {};
    const doc = new DOMParser().parseFromString((await response.text()).slice(0, 300000), "text/html");
    return { title: parseTitle(doc), description: extractDescription(doc) };
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

function baseDomain(hostname) {
  const parts = hostname.replace(/^www\./, "").split(".");
  if (parts.length <= 2) return parts.join(".");
  const secondLevel = /^(co|com|org|net|gov|edu|ac)$/.test(parts[parts.length - 2]);
  return parts.slice(secondLevel ? -3 : -2).join(".");
}

function collectBookmarks(node, output = []) {
  if (node.url) output.push(node);
  (node.children || []).forEach(child => collectBookmarks(child, output));
  return output;
}

// Escolhe a pasta onde já existem favoritos do mesmo domínio; caso contrário, cria uma pasta por domínio.
async function findOrCreateFolder(tree, hostname) {
  const domain = baseDomain(hostname);
  const bookmarks = tree.flatMap(root => collectBookmarks(root));
  const counts = new Map();
  bookmarks.forEach(bookmark => {
    try {
      if (baseDomain(new URL(bookmark.url).hostname) !== domain) return;
    } catch {
      return;
    }
    counts.set(bookmark.parentId, (counts.get(bookmark.parentId) || 0) + 1);
  });
  const best = [...counts].sort((x, y) => y[1] - x[1])[0];
  if (best) return best[0];

  const label = domain.split(".")[0];
  const existing = findFolderByTitle(tree, domain) || findFolderByTitle(tree, label);
  if (existing) return existing.id;

  const bar = findBookmarkBar(tree);
  if (!bar) throw new Error("Barra de favoritos não encontrada.");
  const root = findFolderByTitle(bar.children || [], ORGANIZED_ROOT)
    || await chrome.bookmarks.create({ parentId: bar.id, title: ORGANIZED_ROOT });
  return (await chrome.bookmarks.create({ parentId: root.id, title: domain })).id;
}

async function addFavorite(rawUrl, fallbackTitle = "") {
  const url = new URL(rawUrl);
  if (!/^https?:$/.test(url.protocol)) throw new Error("O link deve começar por http:// ou https://.");
  if (typeof chrome === "undefined" || !chrome.bookmarks) throw new Error("A página precisa de ser aberta através da extensão Edge.");
  const duplicate = await chrome.bookmarks.search({ url: url.href });
  if (duplicate.length) throw new Error("Este link já existe nos favoritos.");
  const info = await fetchPageInfo(url.href);
  const tree = await chrome.bookmarks.getTree();
  const parentId = await findOrCreateFolder(tree, url.hostname);
  await chrome.bookmarks.create({
    parentId,
    title: info.title || fallbackTitle || url.hostname,
    url: url.href
  });
  if (info.description) {
    descriptions[url.href] = { text: info.description, checked: Date.now() };
    await saveDescriptions();
  }
  await loadBrowserData();
}

function renderList(target, items, type) {
  target.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = searchInput.value ? "Não foram encontrados resultados." : `Não existem ${type} recentes.`;
    target.appendChild(empty);
    return;
  }
  const favoriteUrls = new Set(favorites.map(favorite => stripQuery(favorite.url)));
  if (!expandedGroups.has(target)) expandedGroups.set(target, new Set());
  const expanded = expandedGroups.get(target);
  const groups = new Map();
  items.forEach(item => {
    const host = getHostname(item.url);
    if (!groups.has(host)) groups.set(host, []);
    groups.get(host).push(item);
  });
  groups.forEach((groupItems, host) => {
    const box = document.createElement("section");
    box.className = "domain-box";
    const heading = document.createElement("h3");
    heading.className = "domain-title";
    heading.textContent = `${host} (${groupItems.length})`;
    box.appendChild(heading);
    const hasMore = groupItems.length > VISIBLE_GROUP_ITEMS;
    const extraItems = document.createElement("div");
    const isExpanded = hasMore && expanded.has(host);
    extraItems.hidden = !isExpanded;
    groupItems.forEach((item, index) => {
      const link = document.createElement("a");
      link.className = "result";
      link.href = item.url;
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = item.title || item.url;
      const url = document.createElement("div");
      url.className = "result-url";
      url.textContent = item.url;
      link.append(title, url);
      if (type !== "favoritos" && !favoriteUrls.has(stripQuery(item.url))) {
        link.classList.add("has-add");
        const add = document.createElement("button");
        add.type = "button";
        add.className = "result-add";
        add.textContent = "+";
        add.title = "Adicionar aos favoritos (organizado)";
        add.setAttribute("aria-label", "Adicionar aos favoritos");
        add.addEventListener("click", async event => {
          event.preventDefault();
          event.stopPropagation();
          add.disabled = true;
          try {
            await addFavorite(item.url, item.title);
            status.textContent = "Favorito adicionado.";
          } catch (error) {
            add.disabled = false;
            status.textContent = error.message || "Não foi possível adicionar o favorito.";
          }
        });
        link.appendChild(add);
      }
      const description = getDescription(item.url);
      if (description) {
        const descriptionElement = document.createElement("div");
        descriptionElement.className = "result-description";
        descriptionElement.textContent = description;
        descriptionElement.title = description;
        link.appendChild(descriptionElement);
      }
      const meta = document.createElement("div");
      meta.className = "result-meta";
      meta.textContent = item.folder || item.date || "";
      link.appendChild(meta);
      (index < VISIBLE_GROUP_ITEMS ? box : extraItems).appendChild(link);
    });
    if (hasMore) {
      const preview = document.createElement("div");
      preview.className = "domain-preview";
      preview.setAttribute("aria-hidden", "true");
      preview.hidden = isExpanded;
      const previewTitle = document.createElement("div");
      previewTitle.className = "result-title";
      previewTitle.textContent = groupItems[VISIBLE_GROUP_ITEMS].title || groupItems[VISIBLE_GROUP_ITEMS].url;
      const previewUrl = document.createElement("div");
      previewUrl.className = "result-url";
      previewUrl.textContent = groupItems[VISIBLE_GROUP_ITEMS].url;
      preview.append(previewTitle, previewUrl);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "domain-toggle";
      const updateToggle = open => {
        extraItems.hidden = !open;
        preview.hidden = open;
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", `${open ? "Recolher" : "Expandir"} resultados de ${host}`);
        toggle.title = open ? "Recolher resultados" : "Expandir resultados";
      };
      updateToggle(isExpanded);
      toggle.addEventListener("click", () => {
        const open = extraItems.hidden;
        if (open) expanded.add(host);
        else expanded.delete(host);
        updateToggle(open);
      });
      box.append(preview, extraItems, toggle);
    }
    target.appendChild(box);
  });
}

function render() {
  const query = searchInput.value.trim();
  const favoriteMatches = findMatches(favorites, query);
  const historyMatches = findMatches(history, query);
  results.classList.remove("hidden");
  renderList(document.querySelector("#favorites-results"), favoriteMatches, "favoritos");
  renderList(document.querySelector("#history-results"), historyMatches, "páginas no histórico");
  document.querySelector("#favorites-count").textContent = `(${favoriteMatches.length})`;
  document.querySelector("#history-count").textContent = `(${historyMatches.length})`;
  status.textContent = query ? `Resultados para "${query}"` : "A mostrar os itens mais recentes.";
  clearButton.classList.toggle("visible", Boolean(query));
}

async function loadBrowserData() {
  try {
    if (typeof chrome === "undefined" || !chrome.bookmarks || !chrome.history) {
      status.textContent = "Abra esta página através da extensão Edge instalada para consultar os seus dados.";
      return;
    }
    const tree = await chrome.bookmarks.getTree();
    favorites = flattenFavorites(tree).filter(item => /^https?:/i.test(item.url));
    const shortcutsFolder = findFolderByTitle(tree, "favorites-search");
    const shortcuts = (shortcutsFolder?.children || [])
      .filter(item => item.url && /^https?:/i.test(item.url))
      .map(item => ({ id: item.id, title: item.title || item.url, url: item.url }));
    renderShortcuts(shortcuts);
    history = await chrome.history.search({ text: "", maxResults: 500, startTime: 0 });
    history = history.filter(item => item.url).map(item => ({
      title: item.title || item.url,
      url: item.url,
      date: item.lastVisitTime ? new Date(item.lastVisitTime).toLocaleString("pt-PT") : ""
    }));
    status.textContent = `${favorites.length} favoritos e ${history.length} entradas do histórico carregados.`;
    descriptions = (await chrome.storage.local.get(DESCRIPTIONS_KEY))[DESCRIPTIONS_KEY] || {};
    render();
    loadMissingDescriptions([...favorites, ...history]);
  } catch (error) {
    status.textContent = "Não foi possível consultar os dados do Edge. Verifique as permissões da extensão.";
    console.error(error);
  }
}

document.querySelector("#search-form").addEventListener("submit", event => { event.preventDefault(); render(); });
googleSearchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) window.location.href = `https://www.google.pt/search?q=${encodeURIComponent(query)}`;
  else searchInput.focus();
});
clearButton.addEventListener("click", () => { searchInput.value = ""; render(); searchInput.focus(); });
searchInput.addEventListener("input", render);
searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;
    if (event.altKey) {
      window.location.href = `https://www.google.pt/search?q=${encodeURIComponent(query)}`;
      return;
    }
    const firstMatch = findMatches(favorites, query)[0] || findMatches(history, query)[0];
    window.location.href = firstMatch
      ? firstMatch.url
      : `https://www.google.pt/search?q=${encodeURIComponent(query)}`;
  }
});
document.querySelector("#about").addEventListener("click", () => {
  status.textContent = "Esta extensão consulta diretamente os favoritos e o histórico deste perfil Edge.";
});
document.querySelector("#shortcut-cancel").addEventListener("click", closeShortcutModal);
renameShortcutButton.addEventListener("click", openRenameModal);
document.querySelector("#rename-cancel").addEventListener("click", closeRenameModal);
renameModal.addEventListener("click", event => {
  if (event.target === renameModal) closeRenameModal();
});
renameForm.addEventListener("submit", async event => {
  event.preventDefault();
  const title = shortcutTitleInput.value.trim();
  if (!title || !renameTarget) return;
  try {
    await chrome.bookmarks.update(renameTarget.id, { title });
    closeRenameModal();
    renameTarget = null;
    await loadBrowserData();
  } catch (error) {
    renameError.textContent = "Não foi possível mudar o nome.";
    console.error(error);
  }
});
removeShortcutButton.addEventListener("click", async () => {
  if (!selectedShortcut || typeof chrome === "undefined" || !chrome.bookmarks) return;
  const item = selectedShortcut;
  closeShortcutMenu();
  try {
    const tree = await chrome.bookmarks.getTree();
    const shortcutsFolder = findFolderByTitle(tree, "favorites-search");
    const bookmark = (shortcutsFolder?.children || []).find(child => child.url === item.url);
    if (!bookmark) {
      status.textContent = "O atalho já não existe nos favoritos.";
      return;
    }
    await chrome.bookmarks.remove(bookmark.id);
    await loadBrowserData();
  } catch (error) {
    status.textContent = "Não foi possível remover o atalho.";
    console.error(error);
  }
});
document.addEventListener("click", event => {
  if (!shortcutMenu.contains(event.target)) closeShortcutMenu();
});
shortcutModal.addEventListener("click", event => {
  if (event.target === shortcutModal) closeShortcutModal();
});
shortcutForm.addEventListener("submit", async event => {
  event.preventDefault();
  shortcutError.textContent = "";
  let url;
  try {
    url = new URL(shortcutUrlInput.value.trim());
  } catch {
    shortcutError.textContent = "Introduza um link válido.";
    return;
  }
  if (!/^https?:$/.test(url.protocol)) {
    shortcutError.textContent = "O link deve começar por http:// ou https://.";
    return;
  }
  if (typeof chrome === "undefined" || !chrome.bookmarks) {
    shortcutError.textContent = "A página precisa de ser aberta através da extensão Edge.";
    return;
  }
  try {
    const tree = await chrome.bookmarks.getTree();
    const shortcutsFolder = await getShortcutsFolder(tree);
    if (!shortcutsFolder) {
      shortcutError.textContent = "Não foi possível criar a pasta favorites-search nos favoritos.";
      return;
    }
    await chrome.bookmarks.create({
      parentId: shortcutsFolder.id,
      title: url.hostname,
      url: url.href
    });
    closeShortcutModal();
    await loadBrowserData();
  } catch (error) {
    shortcutError.textContent = "Não foi possível guardar o atalho.";
    console.error(error);
  }
});
document.querySelector("#add-favorite").addEventListener("click", () => {
  favoriteError.textContent = "";
  favoriteUrlInput.value = "";
  favoriteModal.classList.remove("hidden");
  favoriteUrlInput.focus();
});
document.querySelector("#favorite-cancel").addEventListener("click", () => favoriteModal.classList.add("hidden"));
favoriteModal.addEventListener("click", event => {
  if (event.target === favoriteModal) favoriteModal.classList.add("hidden");
});
favoriteForm.addEventListener("submit", async event => {
  event.preventDefault();
  favoriteError.textContent = "A adicionar…";
  try {
    await addFavorite(favoriteUrlInput.value.trim());
    favoriteModal.classList.add("hidden");
    status.textContent = "Favorito adicionado.";
  } catch (error) {
    favoriteError.textContent = error instanceof TypeError ? "Introduza um link válido." : error.message;
  }
});
loadBrowserData();
searchInput.focus();
