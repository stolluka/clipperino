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
    const li = document.createElement("li");

    li.innerHTML = `
      <a href="${clip.link}" target="_blank">${clip.link}</a>
      <button class="delete-btn" onclick="deleteClip(${clip.id})">X</button>
    `;

    list.appendChild(li);
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
