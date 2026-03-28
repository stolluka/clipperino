async function loadClips() {
  const password = document.getElementById("password").value;

  const res = await fetch("/api/all-clips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ password })
  });

  if (!res.ok) {
    alert("Falsches Passwort oder Fehler");
    return;
  }

  const clips = await res.json();

  const container = document.getElementById("clips");
  container.innerHTML = "";

  clips.forEach(c => {
    const div = document.createElement("div");
    div.className = "clip-card";

    div.innerHTML = `
      <h3>${c.twitch_name}</h3>
      ${renderClip(c.link)}
    `;

    container.appendChild(div);
  });
}

// ======================
// VIDEO RENDER LOGIK
// ======================
function renderClip(url) {

  // TWITCH
  if (url.includes("twitch.tv")) {
    return `<iframe src="${url.replace("clip/", "embed?clip=")}&parent=${window.location.hostname}" frameborder="0" allowfullscreen></iframe>`;
  }

  // YOUTUBE
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const id = url.split("v=")[1] || url.split("/").pop();
    return `<iframe src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  }

  // TIKTOK
  if (url.includes("tiktok.com")) {
    return `<blockquote class="tiktok-embed"><a href="${url}"></a></blockquote>`;
  }

  // INSTAGRAM
  if (url.includes("instagram.com")) {
    return `<iframe src="${url}/embed" frameborder="0"></iframe>`;
  }

  // FALLBACK
  return `<a href="${url}" target="_blank">${url}</a>`;
}
