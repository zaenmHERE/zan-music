
const audio = document.getElementById("audioPlayer");

const elements = {
  title: document.getElementById("songTitle"),
  artist: document.getElementById("songArtist"),
  play: document.getElementById("playBtn"),
  progress: document.getElementById("progress"),
  current: document.getElementById("currentTime"),
  duration: document.getElementById("duration"),
  input: document.getElementById("fileInput"),
  library: document.getElementById("library"),
  fullLibrary: document.getElementById("libraryFull")
};

let songs = [];
let currentIndex = -1;
let favorites = new Set();

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);

  return `${min}:${String(sec).padStart(2, "0")}`;
}

// NAVIGATION

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;

    document.querySelectorAll(".page").forEach(item => {
      item.classList.remove("active");
    });

    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
    });

    document.getElementById(page).classList.add("active");
    button.classList.add("active");
  });
});

// THEME

const themeBtn = document.getElementById("themeBtn");
const themeIcon = document.getElementById("themeIcon");

let theme = localStorage.getItem("zan-theme") || "dark";

function applyTheme() {
  document.body.classList.toggle("light", theme === "light");
  themeIcon.textContent = theme === "light" ? "☾" : "☼";
  localStorage.setItem("zan-theme", theme);
}

themeBtn.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  applyTheme();
});

applyTheme();

// IMPORT MUSIC

function openFilePicker() {
  elements.input.click();
}

document.getElementById("importBtn").onclick = openFilePicker;
document.getElementById("browseBtn").onclick = openFilePicker;
document.getElementById("libraryImport").onclick = openFilePicker;

elements.input.addEventListener("change", event => {
  const files = Array.from(event.target.files || []);

  files.forEach(file => {
    if (!file.type.startsWith("audio/")) return;

    const song = {
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Unknown Artist",
      file,
      url: URL.createObjectURL(file)
    };

    songs.push(song);
  });

  renderLibrary();

  if (currentIndex === -1 && songs.length > 0) {
    loadSong(0);
  }

  event.target.value = "";
});

// LOAD SONG

function loadSong(index) {
  if (index < 0 || index >= songs.length) return;

  currentIndex = index;

  const song = songs[index];

  audio.src = song.url;
  audio.load();

  elements.title.textContent = song.name;
  elements.artist.textContent = song.artist;

  elements.play.textContent = "▶";

  updateFavoriteButton();
}

// PLAY / PAUSE

elements.play.addEventListener("click", async () => {
  if (!songs.length) {
    openFilePicker();
    return;
  }

  if (audio.paused) {
    try {
      await audio.play();
    } catch (error) {
      console.error("Playback error:", error);
    }
  } else {
    audio.pause();
  }
});

audio.addEventListener("play", () => {
  elements.play.textContent = "Ⅱ";
});

audio.addEventListener("pause", () => {
  elements.play.textContent = "▶";
});

// NEXT / PREVIOUS

function nextSong() {
  if (!songs.length) return;

  const next = (currentIndex + 1) % songs.length;

  loadSong(next);
  audio.play().catch(console.error);
}

function previousSong() {
  if (!songs.length) return;

  const previous =
    (currentIndex - 1 + songs.length) % songs.length;

  loadSong(previous);
  audio.play().catch(console.error);
}

document.getElementById("nextBtn").onclick = nextSong;
document.getElementById("prevBtn").onclick = previousSong;

audio.addEventListener("ended", nextSong);

// PROGRESS BAR

audio.addEventListener("timeupdate", () => {
  const current = audio.currentTime || 0;
  const total = audio.duration || 0;

  elements.current.textContent = formatTime(current);
  elements.duration.textContent = formatTime(total);

  elements.progress.value =
    total > 0 ? (current / total) * 100 : 0;
});

elements.progress.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration)) return;

  audio.currentTime =
    (Number(elements.progress.value) / 100) *
    audio.duration;
});

// FAVORITES

document.getElementById("favoriteBtn").onclick = () => {
  if (currentIndex < 0) return;

  if (favorites.has(currentIndex)) {
    favorites.delete(currentIndex);
  } else {
    favorites.add(currentIndex);
  }

  updateFavoriteButton();
};

function updateFavoriteButton() {
  const active = favorites.has(currentIndex);

  document.getElementById("favoriteBtn").textContent =
    active ? "♥" : "♡";
}

// RENDER LIBRARY

function renderLibrary() {
  if (!songs.length) {
    elements.library.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♫</div>
        <h3>Your library is empty</h3>
        <p>Import MP3 files to start listening.</p>
        <button class="primary-btn" onclick="openFilePicker()">
          Import Music
        </button>
      </div>
    `;

    elements.fullLibrary.innerHTML =
      '<p class="muted">Your imported music will appear here.</p>';

    return;
  }

  const html = songs.map((song, index) => `
    <div class="song-item">
      <div class="song-thumb">♫</div>

      <div class="song-item-info"
           onclick="loadAndPlay(${index})">
        <h4>${escapeHTML(song.name)}</h4>
        <p>${escapeHTML(song.artist)}</p>
      </div>

      <button class="song-action"
              onclick="loadAndPlay(${index})">
        ▶
      </button>
    </div>
  `).join("");

  elements.library.innerHTML = html;
  elements.fullLibrary.innerHTML = html;
}

function loadAndPlay(index) {
  loadSong(index);
  audio.play().catch(console.error);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// MONTHLY STATISTICS PLACEHOLDER

const monthName = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric"
}).format(new Date());

document.getElementById("monthLabel").textContent =
  monthName;

document.getElementById("monthlyTime").innerHTML =
  '0 <span>min</span>';

document.getElementById("tracksPlayed").textContent = "0";
document.getElementById("activeDays").textContent = "0";

renderLibrary();

console.log("ZAN Music initialized successfully.");
