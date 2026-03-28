function getEmbed(url) {
  try {
    // TWITCH
    if (url.includes("twitch.tv")) {
      const id = url.split("/").pop();
      return `<iframe src="https://clips.twitch.tv/embed?clip=${id}&parent=${window.location.hostname}"></iframe>`;
    }

    // YOUTUBE
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let id = "";

      if (url.includes("youtu.be")) {
        id = url.split("/").pop();
      } else {
        const params = new URL(url).searchParams;
        id = params.get("v");
      }

      return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
    }

    // TIKTOK
    if (url.includes("tiktok.com")) {
      return `<blockquote class="tiktok-embed"><a href="${url}"></a></blockquote>
      <script async src="https://www.tiktok.com/embed.js"></script>`;
    }

    // INSTAGRAM
    if (url.includes("instagram.com")) {
      return `<iframe src="${url}/embed"></iframe>`;
    }

    return `<a href="${url}" target="_blank">${url}</a>`;
  } catch {
    return `<a href="${url}" target="_blank">${url}</a>`;
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

    div.innerHTML = `
      <div>${clip.link}</div>
      ${getEmbed(clip.link)}
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
    headers: {
      "Content-Type": "application/json"
    },
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
