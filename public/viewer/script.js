const urlParams = new URLSearchParams(window.location.search);
const pdfPath = urlParams.get("pdf");
const pdfUrl = `https://github.com/sankalp6115/Notes-Storage/blob/main/Power%20Electronics/ACVR%20Numericals%20from%20PS%20Bimbhra.pdf`;
// https://drive.google.com/file/d/1yARbbZhGKSs5v95iuOmBNaDiPQqrsbgK/view?usp=sharing
//https://drive.google.com/uc?export=view&id=1yARbbZhGKSs5v95iuOmBNaDiPQqrsbgK


// const urlParams = new URLSearchParams(window.location.search);
// const pdfName = urlParams.get("name");
// console.log(pdfName);

import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc ="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.7.76/pdf.worker.min.mjs";

//Disable right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

//Block dev tools and print shortcuts
const overlay = document.getElementById("overlay");
document.addEventListener("keydown", (e) => {
  if (
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ["C", "J"].includes(e.key)) ||
    (e.ctrlKey && ["s", "p", "u"].includes(e.key.toLowerCase()))
  ) {
    e.preventDefault();
    overlay.style.opacity = "1";
    setTimeout(()=>{overlay.style.opacity = "0"}, 2000);
  }
});

// Ctrl + Mouse Scroll for Zoom
document.addEventListener("wheel",(e) => {
    if (e.ctrlKey) {e.preventDefault();
                    const prevScale = scale;
      if (e.deltaY < 0) {
        scale += 0.2;
      } else if (e.deltaY > 0 && scale > 0.2) {
        scale -= 0.2;
      }
      updateZoom(prevScale);
    }
  },
  { passive: false }
);

// PDF viewer setup
let pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  scale = 1.0,
  renderScale = window.devicePixelRatio || 2,
  viewerContainer = document.getElementById("viewerContainer"),
  sidebar = document.getElementById("sidebar"),
  canvasContainer = document.createElement("div"),
  pages = [],
  visiblePages = new Set(),
  bufferPages = 3,
  loadingIndicator = document.getElementById("loadingIndicator");
canvasContainer.id = "canvasContainer";
viewerContainer.appendChild(canvasContainer);

const shieldCanvas = document.createElement("canvas");
shieldCanvas.id = "shieldCanvas";
viewerContainer.appendChild(shieldCanvas);
const watermark = new Image();
watermark.src = "https://i.ibb.co/x8123fD7/dt-BOM-no-text.png";

let watermarkLoaded = false;
watermark.onload = () => {
  watermarkLoaded = true;
};

function addWatermark(canvas, pageNumber, renderScale) {
    const ctx = canvas.getContext("2d");

    // Ensure image is loaded before drawing
    if (!watermarkLoaded) return;

    const { width: canvasWidth, height: canvasHeight } = canvas;

    // Clear previous transformations
    ctx.save();

    // Set global alpha for opacity
    ctx.globalAlpha = 0.2; // Adjust as needed

    // Calculate image dimensions relative to zoom
    const imageOriginalWidth = watermark.naturalWidth;
    const imageOriginalHeight = watermark.naturalHeight;

    const scaledWidth = imageOriginalWidth * 0.4 * renderScale;
    const scaledHeight = imageOriginalHeight * 0.4 * renderScale;

    // Center position
    const centerX = (canvasWidth - scaledWidth) / 2;
    const centerY = (canvasHeight - scaledHeight) / 2;

    // Slight randomness if you still want it
    const offsetX = (Math.random() - 0.5) * 10; // smaller randomness
    const offsetY = (Math.random() - 0.5) * 10;

    // Draw image
    ctx.drawImage(watermark, centerX + offsetX, centerY + offsetY, scaledWidth, scaledHeight);

    // Restore context
    ctx.restore();
}

async function initPages() {
  loadingIndicator.style.display = "block";
  canvasContainer.innerHTML = "";
  pages = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: scale * renderScale });
    const canvas = document.createElement("canvas");
    canvas.className = "page";
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width / renderScale}px`; // Adjust display size
    canvas.style.height = `${viewport.height / renderScale}px`;
    canvas.dataset.pageNumber = i;
    canvasContainer.appendChild(canvas);
    pages.push({ page, canvas, viewport, rendered: false });
  }
  await updateVisiblePages();
  shieldCanvas.width = viewerContainer.scrollWidth * renderScale;
  shieldCanvas.height = viewerContainer.scrollHeight * renderScale;
  shieldCanvas.style.width = `${viewerContainer.scrollWidth}px`;
  shieldCanvas.style.height = `${viewerContainer.scrollHeight}px`;
  document.getElementById("pageNumber").value = pageNum;
  document.getElementById("pageCount").textContent = `of ${pdfDoc.numPages}`;
  loadingIndicator.style.display = "none";
}

async function renderPage(pageIndex) {
  if (pages[pageIndex].rendered || pageRendering) return;
  pageRendering = true;
  loadingIndicator.style.display = "block";
  const { page, canvas } = pages[pageIndex];
  const viewport = page.getViewport({ scale: scale * renderScale });
  const ctx = canvas.getContext("2d");
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  canvas.style.width = `${viewport.width / renderScale}px`;
  canvas.style.height = `${viewport.height / renderScale}px`;
  await page.render({ canvasContext: ctx, viewport }).promise;
  addWatermark(canvas, pageIndex + 1, renderScale);
  pages[pageIndex].viewport = viewport;
  pages[pageIndex].rendered = true;
  pageRendering = false;
  loadingIndicator.style.display = "none";
}

async function updateVisiblePages() {
  const scrollTop = viewerContainer.scrollTop;
  const viewerHeight = viewerContainer.clientHeight;
  const newVisiblePages = new Set();
  for (let i = 0; i < pages.length; i++) {
    const canvas = pages[i].canvas;
    const rect = canvas.getBoundingClientRect();
    const isVisible = rect.top < viewerHeight && rect.bottom > 0;
    if (
      isVisible ||
      (i >= Math.max(0, pageNum - 1 - bufferPages) &&
        i <= Math.min(pages.length - 1, pageNum - 1 + bufferPages))
    ) {
      newVisiblePages.add(i);
      if (!pages[i].rendered) {
        await renderPage(i);
      }
    }
  }
  for (let i of visiblePages) {
    if (!newVisiblePages.has(i)) {
      const canvas = pages[i].canvas;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pages[i].rendered = false;
    }
  }
  visiblePages = newVisiblePages;
}

async function updateZoom(prevScale) {
  if (pageRendering) return;
  pageRendering = true;
  loadingIndicator.style.display = "block";

  const currentCanvas = pages[pageNum - 1].canvas;
  const scrollTop = viewerContainer.scrollTop;
  const scrollLeft = viewerContainer.scrollLeft;
  const pageTop =
    currentCanvas.getBoundingClientRect().top +
    scrollTop -
    viewerContainer.getBoundingClientRect().top;
  const pageLeft =
    currentCanvas.getBoundingClientRect().left +
    scrollLeft -
    viewerContainer.getBoundingClientRect().left;
  const scrollRatioY = pageTop / (currentCanvas.height / renderScale);
  const scrollRatioX = pageLeft / (currentCanvas.width / renderScale);

  for (let i = 0; i < pages.length; i++) {
    const { page, canvas } = pages[i];
    const viewport = page.getViewport({ scale: scale * renderScale });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    canvas.style.width = `${viewport.width / renderScale}px`;
    canvas.style.height = `${viewport.height / renderScale}px`;
    pages[i].viewport = viewport;
    if (visiblePages.has(i)) {
      pages[i].rendered = false;
    }
  }

  await updateVisiblePages();

  const newCanvas = pages[pageNum - 1].canvas;
  viewerContainer.scrollTop = scrollRatioY * (newCanvas.height / renderScale);
  viewerContainer.scrollLeft = scrollRatioX * (newCanvas.width / renderScale);

  shieldCanvas.width = viewerContainer.scrollWidth * renderScale;
  shieldCanvas.height = viewerContainer.scrollHeight * renderScale;
  shieldCanvas.style.width = `${viewerContainer.scrollWidth}px`;
  shieldCanvas.style.height = `${viewerContainer.scrollHeight}px`;

  pageRendering = false;
  loadingIndicator.style.display = "none";
  document.getElementById("pageNumber").value = pageNum;
}

viewerContainer.addEventListener("scroll", () => {
  let currentPage = 1;
  for (let i = 0; i < pages.length; i++) {
    const rect = pages[i].canvas.getBoundingClientRect();
    if (rect.top <= viewerContainer.clientHeight / 2) {
      currentPage = i + 1;
    } else {
      break;
    }
  }
  pageNum = currentPage;
  document.getElementById("pageNumber").value = pageNum;
  updateVisiblePages();
});

async function renderThumbnails() {
  sidebar.innerHTML = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.2 * renderScale });
    const canvas = document.createElement("canvas");
    canvas.className = "thumbnail";
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / renderScale}px`;
    canvas.style.height = `${viewport.height / renderScale}px`;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport })
      .promise;
    canvas.onclick = () => {
      pageNum = i;
      const targetPage = pages[i - 1].canvas;
      targetPage.scrollIntoView({ behavior: "smooth" });
      document.getElementById("pageNumber").value = i;
      updateVisiblePages();
    };
    sidebar.appendChild(canvas);
  }
}

pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
document.getElementById("pageCount").textContent = `of ${pdfDoc.numPages}`;
initPages();
renderThumbnails();

document.getElementById("prevPage").onclick = () => {
  if (pageNum <= 1) return;
  pageNum--;
  const targetPage = pages[pageNum - 1].canvas;
  targetPage.scrollIntoView({ behavior: "smooth" });
  document.getElementById("pageNumber").value = pageNum;
  updateVisiblePages();
};
document.getElementById("nextPage").onclick = () => {
  if (pageNum >= pdfDoc.numPages) return;
  pageNum++;
  const targetPage = pages[pageNum - 1].canvas;
  targetPage.scrollIntoView({ behavior: "smooth" });
  document.getElementById("pageNumber").value = pageNum;
  updateVisiblePages();
};
document.getElementById("pageNumber").onchange = (e) => {
  const num = parseInt(e.target.value);
  if (num >= 1 && num <= pdfDoc.numPages) {
    pageNum = num;
    const targetPage = pages[num - 1].canvas;
    targetPage.scrollIntoView({ behavior: "smooth" });
    document.getElementById("pageNumber").value = num;
    updateVisiblePages();
  }
};
document.getElementById("zoomIn").onclick = () => {
  const prevScale = scale;
  scale += 0.1;
  updateZoom(prevScale);
};
document.getElementById("zoomOut").onclick = () => {
  if (scale <= 0.2) return;
  const prevScale = scale;
  scale -= 0.1;
  updateZoom(prevScale);
};
document.getElementById("toggleSidebar").onclick = () => {
  sidebar.classList.toggle("open");
};
document.getElementById("darkModeToggle").onclick = () => {
  document.body.classList.toggle("dark-mode");
};
document.getElementById("searchInput").oninput = async (e) => {
  const query = e.target.value;
  if (!query) return;
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join("");
    if (text.toLowerCase().includes(query.toLowerCase())) {
      pageNum = i;
      const targetPage = pages[i - 1].canvas;
      targetPage.scrollIntoView({ behavior: "smooth" });
      document.getElementById("pageNumber").value = i;
      updateVisiblePages();
      break;
    }
  }
};

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" && pageNum > 1) {
    pageNum--;
    const targetPage = pages[pageNum - 1].canvas;
    targetPage.scrollIntoView({ behavior: "smooth" });
    document.getElementById("pageNumber").value = pageNum;
    updateVisiblePages();
  } else if (e.key === "ArrowRight" && pageNum < pdfDoc.numPages) {
    pageNum++;
    const targetPage = pages[pageNum - 1].canvas;
    targetPage.scrollIntoView({ behavior: "smooth" });
    document.getElementById("pageNumber").value = pageNum;
    updateVisiblePages();
  } else if (e.key === "+" || e.key === "=") {
    const prevScale = scale;
    scale += 0.1;
    updateZoom(prevScale);
  } else if (e.key === "-") {
    if (scale > 0.2) {
      const prevScale = scale;
      scale -= 0.1;
      updateZoom(prevScale);
    }
  }
});
