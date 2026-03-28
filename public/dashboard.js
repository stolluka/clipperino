let clips = [];

function addClip() {
  const input = document.getElementById("clipInput");
  const link = input.value;

  if (!link) return alert("Bitte Link eingeben!");

  if (clips.length >= 5) {
    return alert("Maximal 5 Clips erlaubt!");
  }

  clips.push(link);
  input.value = "";
  renderClips();
}

function removeClip(index) {
  clips.splice(index, 1);
  renderClips();
}

function renderClips() {
  const list = document.getElementById("clipList");
  list.innerHTML = "";

  clips.forEach((clip, index) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <a href="${clip}" target="_blank">${clip}</a>
      <button onclick="removeClip(${index})">❌</button>
    `;

    list.appendChild(li);
  });
}
