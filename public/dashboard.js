document.getElementById("loading").style.display = "none";

function getEmbedUrl(url) {
  try {
    if (!url.includes("twitch.tv")) return null;

    const parts = url.split("/");
    const clipId = parts[parts.length - 1];

    return `https://clips.twitch.tv/embed?clip=${clipId}&parent=${window.location.hostname}`;
  } catch {
    return null;
  }
}

async function loadClips() {
  const res = await fetch("/api/clips");

  if (res.status === 401) {
    window.location.href = "/";
    return;
  }

  const clips = await res.json();
  const list = document.getElementById("clipList");

  list.innerHTML = "";

  clips.forEach(clip => {
    const div = document.createElement("div");
    div.className = "clip-card";

    const embed = getEmbedUrl(clip.link);

    div.innerHTML = `
      <div>${clip.link}</div>
      ${embed ? `<iframe src="${embed}" allowfullscreen></iframe>` : ""}
      <button class="delete-btn" onclick="deleteClip(${clip.id})">Löschen</button>
    `;

    list.appendChild(div);
  });
}

async function addClip() {
  const input = document.getElementById("clipInput");
  const link = input.value;

  if (!link) return;

  const res = await fetch("/api/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ link })
  });

  if (!res.ok) {
    alert(await res.text());
    return;
  }

  input.value = "";
  loadClips();
}

async function deleteClip(id) {
  await fetch("/api/clips/" + id, { method: "DELETE" });
  loadClips();
}

loadClips();
