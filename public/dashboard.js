async function loadClips() {
  const res = await fetch("/api/clips");
  const clips = await res.json();

  const list = document.getElementById("clipList");
  list.innerHTML = "";

  clips.forEach((clip) => {
    const li = document.createElement("li");

    li.innerHTML = `
      <a href="${clip.link}" target="_blank">${clip.link}</a>
      <button onclick="deleteClip(${clip.id})">❌</button>
    `;

    list.appendChild(li);
  });
}

async function addClip() {
  const input = document.getElementById("clipInput");
  const link = input.value;

  if (!link) return alert("Link fehlt!");

  await fetch("/api/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link })
  });

  input.value = "";
  loadClips();
}

async function deleteClip(id) {
  await fetch("/api/clips/" + id, { method: "DELETE" });
  loadClips();
}

loadClips();
