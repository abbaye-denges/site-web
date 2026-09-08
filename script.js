import * as pdfjsLib from "./assets/pdf.min.mjs";

const PDF_PATH = "./assets/Livret_de_fete_2026_web.pdf";
const MOBILE_QUERY = "(max-width: 760px)";
const ZOOM_MIN = 0.75;
const ZOOM_MAX = 1.6;
const ZOOM_STEP = 0.15;

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("./assets/pdf.worker.min.mjs", import.meta.url).toString();

const elements = {
  app: document.querySelector("#app"),
  viewer: document.querySelector("#viewer"),
  bookStage: document.querySelector("#bookStage"),
  book: document.querySelector("#book"),
  leftPaper: document.querySelector("#leftPaper"),
  rightPaper: document.querySelector("#rightPaper"),
  leftCanvas: document.querySelector("#leftCanvas"),
  rightCanvas: document.querySelector("#rightCanvas"),
  flipSheet: document.querySelector("#flipSheet"),
  flipFront: document.querySelector("#flipFront"),
  flipBack: document.querySelector("#flipBack"),
  loadingPanel: document.querySelector("#loadingPanel"),
  loadingText: document.querySelector("#loadingText"),
  errorPanel: document.querySelector("#errorPanel"),
  gestureHint: document.querySelector("#gestureHint"),
  pageStatus: document.querySelector("#pageStatus"),
  firstButton: document.querySelector("#firstButton"),
  previousButton: document.querySelector("#previousButton"),
  nextButton: document.querySelector("#nextButton"),
  lastButton: document.querySelector("#lastButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  fitButton: document.querySelector("#fitButton"),
  fullscreenButton: document.querySelector("#fullscreenButton"),
};

const media = window.matchMedia(MOBILE_QUERY);
const state = {
  pdf: null,
  total: 0,
  aspectRatio: 1.42,
  mobile: media.matches,
  page: 1,
  spread: 0,
  zoom: 1,
  busy: false,
  renderVersion: 0,
  resizeTimer: 0,
};

function spreadPages(spread = state.spread) {
  if (spread === 0) return { left: 0, right: 1 };
  return {
    left: spread * 2,
    right: spread * 2 + 1 <= state.total ? spread * 2 + 1 : 0,
  };
}

function maxSpread() {
  return Math.ceil((state.total - 1) / 2);
}

function visiblePageForUrl() {
  if (state.mobile) return state.page;
  const pages = spreadPages();
  return pages.right || pages.left || 1;
}

function readInitialPage() {
  const match = window.location.hash.match(/page=(\d+)/i);
  const requested = match ? Number(match[1]) : 1;
  return Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), state.total);
}

function syncUrl() {
  const page = visiblePageForUrl();
  const nextHash = `#page=${page}`;
  if (window.location.hash !== nextHash) history.replaceState(null, "", nextHash);
}

function copyCanvas(source, target) {
  target.width = source.width;
  target.height = source.height;
  const context = target.getContext("2d", { alpha: false });
  context.clearRect(0, 0, target.width, target.height);
  if (source.width && source.height) context.drawImage(source, 0, 0);
}

async function renderSurface(surface, pageNumber, version = state.renderVersion) {
  const canvas = surface.querySelector("canvas");
  surface.classList.toggle("is-blank", !pageNumber);
  if (!pageNumber) {
    canvas.width = 1;
    canvas.height = 1;
    return;
  }

  const page = await state.pdf.getPage(pageNumber);
  if (version !== state.renderVersion) return;

  const baseViewport = page.getViewport({ scale: 1 });
  const cssWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--page-width"));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.1);
  const requestedWidth = Math.max(cssWidth * pixelRatio, 1);
  const outputWidth = Math.min(requestedWidth, 1800);
  const viewport = page.getViewport({ scale: outputWidth / baseViewport.width });

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  canvas.setAttribute("aria-label", `Page ${pageNumber}`);

  const context = canvas.getContext("2d", { alpha: false });
  context.save();
  context.fillStyle = "#f8f6ee";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();

  await page.render({ canvasContext: context, viewport }).promise;
}

async function drawCurrentView() {
  const version = ++state.renderVersion;
  if (state.mobile) {
    await renderSurface(elements.rightPaper, state.page, version);
    elements.rightPaper.setAttribute("aria-label", `Page ${state.page} sur ${state.total}`);
    return;
  }

  const pages = spreadPages();
  await Promise.all([
    renderSurface(elements.leftPaper, pages.left, version),
    renderSurface(elements.rightPaper, pages.right, version),
  ]);
  elements.leftPaper.setAttribute("aria-label", pages.left ? `Page ${pages.left} sur ${state.total}` : "Intérieur de couverture");
  elements.rightPaper.setAttribute("aria-label", pages.right ? `Page ${pages.right} sur ${state.total}` : "Fin du livret");
}

function updateControls() {
  const atStart = state.mobile ? state.page <= 1 : state.spread <= 0;
  const atEnd = state.mobile ? state.page >= state.total : state.spread >= maxSpread();
  const disabled = state.busy || !state.pdf;

  elements.firstButton.disabled = disabled || atStart;
  elements.previousButton.disabled = disabled || atStart;
  elements.nextButton.disabled = disabled || atEnd;
  elements.lastButton.disabled = disabled || atEnd;
  elements.zoomOutButton.disabled = disabled || state.zoom <= ZOOM_MIN;
  elements.zoomInButton.disabled = disabled || state.zoom >= ZOOM_MAX;

  if (!state.total) {
    elements.pageStatus.textContent = "Page 1";
  } else if (state.mobile) {
    elements.pageStatus.textContent = `Page ${state.page} sur ${state.total}`;
  } else {
    const { left, right } = spreadPages();
    elements.pageStatus.textContent = left && right
      ? `Pages ${left}–${right} sur ${state.total}`
      : `Page ${right || left} sur ${state.total}`;
  }

  elements.fitButton.textContent = `${Math.round(state.zoom * 100)} %`;
  syncUrl();
}

function calculateBookSize() {
  const stageWidth = Math.max(elements.viewer.clientWidth - 52, 260);
  const stageHeight = Math.max(elements.viewer.clientHeight - 64, 300);
  const pagesAcross = state.mobile ? 1 : 2;
  const fitWidth = stageWidth / pagesAcross;
  const fitHeight = stageHeight / state.aspectRatio;
  const baseWidth = Math.max(Math.min(fitWidth, fitHeight, 560), 220);
  const pageWidth = baseWidth * state.zoom;
  document.documentElement.style.setProperty("--page-width", `${pageWidth}px`);
  document.documentElement.style.setProperty("--page-height", `${pageWidth * state.aspectRatio}px`);
}

async function refreshLayout() {
  if (!state.pdf || state.busy) return;
  calculateBookSize();
  await drawCurrentView();
}

function resetFlipSheet() {
  elements.flipSheet.classList.remove("turn-next", "turn-previous");
  elements.flipSheet.style.removeProperty("animation");
  elements.flipFront.classList.remove("is-blank");
  elements.flipBack.classList.remove("is-blank");
}

function waitForAnimation() {
  return new Promise((resolve) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      requestAnimationFrame(resolve);
      return;
    }

    const timer = window.setTimeout(resolve, 920);
    elements.flipSheet.addEventListener("animationend", () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function turnNext() {
  if (state.busy || !state.pdf) return;
  const atEnd = state.mobile ? state.page >= state.total : state.spread >= maxSpread();
  if (atEnd) return;

  state.busy = true;
  updateControls();
  resetFlipSheet();
  const version = ++state.renderVersion;

  if (state.mobile) {
    copyCanvas(elements.rightCanvas, elements.flipFront.querySelector("canvas"));
    elements.flipFront.classList.toggle("is-blank", elements.rightPaper.classList.contains("is-blank"));
    await Promise.all([
      renderSurface(elements.flipBack, state.page + 1, version),
      renderSurface(elements.rightPaper, state.page + 1, version),
    ]);
  } else {
    const current = spreadPages(state.spread);
    const upcoming = spreadPages(state.spread + 1);
    copyCanvas(elements.rightCanvas, elements.flipFront.querySelector("canvas"));
    elements.flipFront.classList.toggle("is-blank", !current.right);
    await Promise.all([
      renderSurface(elements.flipBack, upcoming.left, version),
      renderSurface(elements.rightPaper, upcoming.right, version),
    ]);
  }

  elements.flipSheet.classList.add("turn-next");
  await waitForAnimation();
  if (state.mobile) state.page += 1;
  else state.spread += 1;
  await drawCurrentView();
  resetFlipSheet();
  state.busy = false;
  updateControls();
}

async function turnPrevious() {
  if (state.busy || !state.pdf) return;
  const atStart = state.mobile ? state.page <= 1 : state.spread <= 0;
  if (atStart) return;

  state.busy = true;
  updateControls();
  resetFlipSheet();
  const version = ++state.renderVersion;

  if (state.mobile) {
    copyCanvas(elements.rightCanvas, elements.flipFront.querySelector("canvas"));
    elements.flipFront.classList.toggle("is-blank", elements.rightPaper.classList.contains("is-blank"));
    await Promise.all([
      renderSurface(elements.flipBack, state.page - 1, version),
      renderSurface(elements.rightPaper, state.page - 1, version),
    ]);
  } else {
    const current = spreadPages(state.spread);
    const preceding = spreadPages(state.spread - 1);
    copyCanvas(elements.leftCanvas, elements.flipFront.querySelector("canvas"));
    elements.flipFront.classList.toggle("is-blank", !current.left);
    await Promise.all([
      renderSurface(elements.flipBack, preceding.right, version),
      renderSurface(elements.leftPaper, preceding.left, version),
    ]);
  }

  elements.flipSheet.classList.add("turn-previous");
  await waitForAnimation();
  if (state.mobile) state.page -= 1;
  else state.spread -= 1;
  await drawCurrentView();
  resetFlipSheet();
  state.busy = false;
  updateControls();
}

async function jumpTo(pageNumber) {
  if (state.busy || !state.pdf) return;
  state.busy = true;
  state.renderVersion += 1;
  if (state.mobile) state.page = pageNumber;
  else state.spread = pageNumber <= 1 ? 0 : Math.ceil((pageNumber - 1) / 2);
  await drawCurrentView();
  state.busy = false;
  updateControls();
}

async function setZoom(nextZoom) {
  const clamped = Math.min(Math.max(nextZoom, ZOOM_MIN), ZOOM_MAX);
  if (Math.abs(clamped - state.zoom) < 0.01 || state.busy) return;
  state.zoom = clamped;
  updateControls();
  await refreshLayout();
  requestAnimationFrame(() => {
    elements.bookStage.scrollTo({
      left: Math.max((elements.bookStage.scrollWidth - elements.bookStage.clientWidth) / 2, 0),
      top: Math.max((elements.bookStage.scrollHeight - elements.bookStage.clientHeight) / 2, 0),
      behavior: "smooth",
    });
  });
}

async function handleModeChange() {
  if (state.busy || !state.pdf) return;
  const previousMode = state.mobile;
  state.mobile = media.matches;
  if (previousMode === state.mobile) return;

  if (state.mobile) {
    const pages = spreadPages();
    state.page = pages.right || pages.left || 1;
  } else {
    state.spread = state.page <= 1 ? 0 : Math.ceil((state.page - 1) / 2);
  }

  calculateBookSize();
  await drawCurrentView();
  updateControls();
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await elements.app.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    elements.fullscreenButton.hidden = true;
  }
}

function bindInteractions() {
  elements.nextButton.addEventListener("click", turnNext);
  elements.previousButton.addEventListener("click", turnPrevious);
  elements.firstButton.addEventListener("click", () => jumpTo(1));
  elements.lastButton.addEventListener("click", () => jumpTo(state.total));
  elements.zoomOutButton.addEventListener("click", () => setZoom(state.zoom - ZOOM_STEP));
  elements.zoomInButton.addEventListener("click", () => setZoom(state.zoom + ZOOM_STEP));
  elements.fitButton.addEventListener("click", () => setZoom(1));
  elements.fullscreenButton.addEventListener("click", toggleFullscreen);

  document.addEventListener("fullscreenchange", () => {
    const active = Boolean(document.fullscreenElement);
    elements.fullscreenButton.setAttribute("aria-pressed", String(active));
    elements.fullscreenButton.setAttribute("aria-label", active ? "Quitter le plein écran" : "Passer en plein écran");
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(refreshLayout, 120);
  });

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      turnNext();
    }
    if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      turnPrevious();
    }
    if (event.key === "Home") {
      event.preventDefault();
      jumpTo(1);
    }
    if (event.key === "End") {
      event.preventDefault();
      jumpTo(state.total);
    }
  });

  let pointerStart = null;
  elements.book.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  });

  elements.book.addEventListener("pointerup", (event) => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    const start = pointerStart;
    pointerStart = null;

    if (Math.abs(deltaX) > 54 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) turnNext();
      else turnPrevious();
      return;
    }

    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) {
      const bounds = elements.book.getBoundingClientRect();
      const ratio = (event.clientX - bounds.left) / bounds.width;
      if (ratio < 0.43) turnPrevious();
      else if (ratio > 0.57) turnNext();
    }
  });

  elements.book.addEventListener("pointercancel", () => { pointerStart = null; });
  media.addEventListener("change", handleModeChange);

  const resizeObserver = new ResizeObserver(() => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(refreshLayout, 160);
  });
  resizeObserver.observe(elements.viewer);
}

async function loadBook() {
  try {
    const loadingTask = pdfjsLib.getDocument({ url: PDF_PATH });
    loadingTask.onProgress = ({ loaded, total }) => {
      if (!total) return;
      const percent = Math.min(Math.round((loaded / total) * 100), 100);
      elements.loadingText.textContent = `Chargement · ${percent} %`;
    };

    state.pdf = await loadingTask.promise;
    state.total = state.pdf.numPages;
    const firstPage = await state.pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    state.aspectRatio = viewport.height / viewport.width;
    state.mobile = media.matches;

    const initialPage = readInitialPage();
    state.page = initialPage;
    state.spread = initialPage <= 1 ? 0 : Math.ceil((initialPage - 1) / 2);
    calculateBookSize();
    await drawCurrentView();

    elements.loadingPanel.hidden = true;
    elements.bookStage.hidden = false;
    elements.gestureHint.hidden = false;
    updateControls();

    window.setTimeout(() => {
      elements.gestureHint.style.transition = "opacity 500ms ease";
      elements.gestureHint.style.opacity = "0";
      window.setTimeout(() => { elements.gestureHint.hidden = true; }, 520);
    }, 4200);
  } catch (error) {
    console.error("Impossible de charger le livret", error);
    elements.loadingPanel.hidden = true;
    elements.errorPanel.hidden = false;
  }
}

bindInteractions();
loadBook();
