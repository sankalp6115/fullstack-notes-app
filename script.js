const notesContainer = document.getElementById("notesContainer");

fetch("./notes")
  .then(res => res.json())
  .then(data => {
    data.forEach(note => {
      const card = document.createElement("div");
      card.className = "note-card";
      card.innerHTML = `
        <h3>${note.title}</h3>
        <p>${note.subject}</p>
        <button onclick="openPDF('${note.filePath}')">Open</button>
      `;
      notesContainer.appendChild(card);
    });
  });

function openPDF(filePath) {
  const encodedPath = encodeURIComponent(filePath);
  window.open(`/viewer/viewer.html?pdf=${encodedPath}`, "_blank");
}
