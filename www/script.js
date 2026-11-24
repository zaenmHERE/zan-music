(() => {
  'use strict';

  // ==================== KONFIGURASI & STATE ====================
  const DB_NAME = 'zan_music_db_v1';
  const DB_VERSION = 1;
  const STORE_TRACKS = 'tracks';
  const STORE_STATS = 'stats';
  const STATS_KEY = 'listening_stats_v1';

  const state = {
    tracks: [],
    filteredTracks: [],
    recommendedIds: [],
    currentTrackId: null,
    isPlaying: false,
    isSeeking: false,
    editingTrackId: null,
    activeTab: 'musik',
    stats: createDefaultStats(),
    activeObjectUrl: null,
    activeObjectTrackId: null,
    db: null,
    toastTimer: null,
    playCountedForSession: false
  };

  function createDefaultStats() {
    return {
      totalPlays: 0,
      playCountsByTrack: {}, // { [trackId]: number }
      dailyPlays: {}         // { "YYYY-MM-DD": number }
    };
  }

  // ==================== REFERENSI DOM ====================
  const dom = {
    audio: document.getElementById('audio-engine'),
    toast: document.getElementById('toast'),

    // Tabs & Pages
    navItems: Array.from(document.querySelectorAll('.nav-item')),
    pages: {
      musik: document.getElementById('page-musik'),
      playlist: document.getElementById('page-playlist'),
      saya: document.getElementById('page-saya')
    },

    // Halaman Musik
    greetingTitle: document.getElementById('greeting-title'),
    quickImportBtn: document.getElementById('quick-import-btn'),
    heroSection: document.getElementById('hero-section'),
    heroDuration: document.getElementById('hero-duration'),
    heroArtBtn: document.getElementById('hero-art-btn'),
    heroTitle: document.getElementById('hero-title'),
    heroArtist: document.getElementById('hero-artist'),
    heroPlayBtn: document.getElementById('hero-play-btn'),
    heroPlayIcon: document.getElementById('hero-play-icon'),
    heroPlayText: document.getElementById('hero-play-text'),
    heroExpandBtn: document.getElementById('hero-expand-btn'),
    frequentTracks: document.getElementById('frequent-tracks'),
    recommendedTracks: document.getElementById('recommended-tracks'),
    refreshRecommendBtn: document.getElementById('refresh-recommend-btn'),

    // Halaman Playlist
    playlistSubtitle: document.getElementById('playlist-subtitle'),
    addMusicBtn: document.getElementById('add-music-btn'),
    emptyAddBtn: document.getElementById('empty-add-btn'),
    musicFileInput: document.getElementById('music-file-input'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    emptyPlaylist: document.getElementById('empty-playlist'),
    playlistTracks: document.getElementById('playlist-tracks'),

    // Halaman Saya
    statTotalPlays: document.getElementById('stat-total-plays'),
    statTotalTracks: document.getElementById('stat-total-tracks'),
    statTotalArtists: document.getElementById('stat-total-artists'),
    statMonthPlays: document.getElementById('stat-month-plays'),
    chartTotal7d: document.getElementById('chart-total-7d'),
    weeklyChart: document.getElementById('weekly-chart'),
    topTrackTitle: document.getElementById('top-track-title'),
    topTrackArtist: document.getElementById('top-track-artist'),
    topTrackCount: document.getElementById('top-track-count'),
    playTopTrackBtn: document.getElementById('play-top-track-btn'),

    // Mini Player
    miniPlayer: document.getElementById('mini-player'),
    miniProgressFill: document.getElementById('mini-progress-fill'),
    miniOpenFull: document.getElementById('mini-open-full'),
    miniTitle: document.getElementById('mini-title'),
    miniArtist: document.getElementById('mini-artist'),
    miniTime: document.getElementById('mini-time'),
    miniPrevBtn: document.getElementById('mini-prev-btn'),
    miniPlayBtn: document.getElementById('mini-play-btn'),
    miniNextBtn: document.getElementById('mini-next-btn'),

    // Now Playing Fullscreen
    nowPlayingModal: document.getElementById('now-playing-modal'),
    npCloseBtn: document.getElementById('np-close-btn'),
    npEditBtn: document.getElementById('np-edit-btn'),
    npTitle: document.getElementById('np-title'),
    npArtist: document.getElementById('np-artist'),
    npSeekSlider: document.getElementById('np-seek-slider'),
    npCurrentTime: document.getElementById('np-current-time'),
    npTotalTime: document.getElementById('np-total-time'),
    npPrevBtn: document.getElementById('np-prev-btn'),
    npPlayBtn: document.getElementById('np-play-btn'),
    npNextBtn: document.getElementById('np-next-btn'),

    // Edit Modal
    editModal: document.getElementById('edit-modal'),
    editTrackForm: document.getElementById('edit-track-form'),
    editTitleInput: document.getElementById('edit-title-input'),
    editArtistInput: document.getElementById('edit-artist-input'),
    cancelEditBtn: document.getElementById('cancel-edit-btn')
  };

  // ==================== UTILITAS ====================
  function showToast(message) {
    if (!dom.toast) return;
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      dom.toast.classList.remove('show');
    }, 2200);
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    const total = Math.floor(sec);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function getDateKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getCurrentMonthPrefix() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-`;
  }

  function parseFilenameMetadata(filename) {
    const clean = filename.replace(/\.[^/.]+$/, '').replace(/[_]+/g, ' ').trim();
    const parts = clean.split(' - ');
    if (parts.length >= 2) {
      return {
        artist: parts[0].trim() || 'Artis Lokal',
        title: parts.slice(1).join(' - ').trim() || clean
      };
    }
    return {
      artist: 'Artis Lokal',
      title: clean || 'Judul Tidak Diketahui'
    };
  }

  function setGreetingByTime() {
    const hour = new Date().getHours();
    let sapaan = 'Selamat Malam';
    if (hour >= 4 && hour < 11) sapaan = 'Selamat Pagi';
    else if (hour >= 11 && hour < 15) sapaan = 'Selamat Siang';
    else if (hour >= 15 && hour < 19) sapaan = 'Selamat Sore';
    dom.greetingTitle.textContent = `${sapaan}, Pendengar`;
  }

  // ==================== MANAJEMEN OBJECT URL (ANTI LEAK) ====================
  function revokeCurrentObjectUrl() {
    if (state.activeObjectUrl) {
      try {
        URL.revokeObjectURL(state.activeObjectUrl);
      } catch (_) {}
      state.activeObjectUrl = null;
      state.activeObjectTrackId = null;
    }
  }

  function createTrackObjectUrl(track) {
    if (!track || !(track.blob instanceof Blob)) return null;
    if (state.activeObjectTrackId === track.id && state.activeObjectUrl) {
      return state.activeObjectUrl;
    }
    revokeCurrentObjectUrl();
    const url = URL.createObjectURL(track.blob);
    state.activeObjectUrl = url;
    state.activeObjectTrackId = track.id;
    return url;
  }

  // ==================== INDEXEDDB STORAGE ====================
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_TRACKS)) {
          db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_STATS)) {
          db.createObjectStore(STORE_STATS, { keyPath: 'key' });
        }
      };

      req.onsuccess = (event) => {
        state.db = event.target.result;
        resolve(state.db);
      };

      req.onerror = () => {
        reject(req.error || new Error('Gagal membuka IndexedDB'));
      };
    });
  }

  function loadAllTracksFromDB() {
    return new Promise((resolve, reject) => {
      if (!state.db) return resolve([]);
      const tx = state.db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? req.result : [];
        list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  function putTrackToDB(track) {
    return new Promise((resolve, reject) => {
      if (!state.db) return reject(new Error('DB belum siap'));
      const tx = state.db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.put(track);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function deleteTrackFromDB(trackId) {
    return new Promise((resolve, reject) => {
      if (!state.db) return reject(new Error('DB belum siap'));
      const tx = state.db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.delete(trackId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  function loadStatsFromDB() {
    return new Promise((resolve) => {
      if (!state.db) return resolve(createDefaultStats());
      const tx = state.db.transaction(STORE_STATS, 'readonly');
      const store = tx.objectStore(STORE_STATS);
      const req = store.get(STATS_KEY);
      req.onsuccess = () => {
        const data = req.result && req.result.value;
        if (data && typeof data === 'object') {
          resolve({
            totalPlays: Number(data.totalPlays) || 0,
            playCountsByTrack: data.playCountsByTrack && typeof data.playCountsByTrack === 'object' ? data.playCountsByTrack : {},
            dailyPlays: data.dailyPlays && typeof data.dailyPlays === 'object' ? data.dailyPlays : {}
          });
        } else {
          resolve(createDefaultStats());
        }
      };
      req.onerror = () => resolve(createDefaultStats());
    });
  }

  function saveStatsToDB() {
    return new Promise((resolve) => {
      if (!state.db) return resolve();
      const tx = state.db.transaction(STORE_STATS, 'readwrite');
      const store = tx.objectStore(STORE_STATS);
      store.put({ key: STATS_KEY, value: state.stats });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }

  // ==================== MEDIA SESSION & BACKGROUND SYNC ====================
  function updateMediaSessionMetadata(track) {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'ZAN MUSIC',
        artwork: [
          { src: 'assets/icon.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'assets/icon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      });
    } catch (_) {}
  }

  function updateMediaSessionPlaybackState() {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }

  function syncMediaPositionState() {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
    const duration = dom.audio.duration;
    if (Number.isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          playbackRate: dom.audio.playbackRate || 1,
          position: Math.min(dom.audio.currentTime || 0, duration)
        });
      } catch (_) {}
    }
  }

  function setupMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play: () => { playCurrentOrFirst(); },
      pause: () => { pausePlayback(); },
      previoustrack: () => { playPreviousTrack(); },
      nexttrack: () => { playNextTrack(); },
      seekto: (details) => {
        if (details && typeof details.seekTime === 'number' && Number.isFinite(details.seekTime)) {
          dom.audio.currentTime = Math.max(0, Math.min(details.seekTime, dom.audio.duration || details.seekTime));
          syncMediaPositionState();
        }
      }
    };

    Object.entries(handlers).forEach(([action, fn]) => {
      try {
        navigator.mediaSession.setActionHandler(action, fn);
      } catch (_) {}
    });
  }

  // ==================== LOGIKA PEMUTAR MUSIK ====================
  function getTrackById(id) {
    return state.tracks.find((t) => t.id === id) || null;
  }

  function getActiveTrack() {
    return getTrackById(state.currentTrackId) || state.tracks[0] || null;
  }

  async function loadAndPlayTrack(trackId, autoPlay = true) {
    const track = getTrackById(trackId);
    if (!track) {
      showToast('Lagu tidak ditemukan');
      return;
    }

    const url = createTrackObjectUrl(track);
    if (!url) {
      showToast('File audio tidak valid');
      return;
    }

    state.currentTrackId = track.id;
    state.playCountedForSession = false;

    if (dom.audio.src !== url) {
      dom.audio.src = url;
      dom.audio.load();
    }

    updateMediaSessionMetadata(track);
    renderPlayerUI();
    renderTrackLists();

    if (autoPlay) {
      try {
        await dom.audio.play();
      } catch (err) {
        console.error('Audio play error:', err);
        state.isPlaying = false;
        updateMediaSessionPlaybackState();
        renderPlayerUI();
        showToast('Tidak dapat memutar file ini di perangkat');
      }
    }
  }

  async function playCurrentOrFirst() {
    const active = getActiveTrack();
    if (!active) {
      showToast('Belum ada lagu. Impor musik dulu di tab Playlist.');
      switchTab('playlist');
      return;
    }

    const expectedUrl = createTrackObjectUrl(active);
    if (state.currentTrackId !== active.id || dom.audio.src !== expectedUrl) {
      await loadAndPlayTrack(active.id, true);
      return;
    }

    try {
      await dom.audio.play();
    } catch (err) {
      console.error('Resume error:', err);
      showToast('Gagal melanjutkan pemutaran');
    }
  }

  function pausePlayback() {
    dom.audio.pause();
  }

  async function togglePlayPause() {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      await playCurrentOrFirst();
    }
  }

  async function playNextTrack() {
    if (state.tracks.length === 0) return;
    const idx = state.tracks.findIndex((t) => t.id === state.currentTrackId);
    const nextIdx = idx === -1 ? 0 : (idx + 1) % state.tracks.length;
    await loadAndPlayTrack(state.tracks[nextIdx].id, true);
  }

  async function playPreviousTrack() {
    if (state.tracks.length === 0) return;
    if (dom.audio.currentTime > 3) {
      dom.audio.currentTime = 0;
      return;
    }
    const idx = state.tracks.findIndex((t) => t.id === state.currentTrackId);
    const prevIdx = idx <= 0 ? state.tracks.length - 1 : idx - 1;
    await loadAndPlayTrack(state.tracks[prevIdx].id, true);
  }

  async function recordTrackPlay(trackId) {
    if (!trackId || state.playCountedForSession) return;
    state.playCountedForSession = true;

    const todayKey = getDateKey(0);
    state.stats.totalPlays = (Number(state.stats.totalPlays) || 0) + 1;
    state.stats.playCountsByTrack[trackId] = (Number(state.stats.playCountsByTrack[trackId]) || 0) + 1;
    state.stats.dailyPlays[todayKey] = (Number(state.stats.dailyPlays[todayKey]) || 0) + 1;

    await saveStatsToDB();
    renderStatsPage();
    renderFrequentTracks();
  }

  // ==================== IMPOR, EDIT, HAPUS & CARI ====================
  async function handleFilesSelected(fileList) {
    const files = Array.from(fileList || []);
    dom.musicFileInput.value = '';
    if (files.length === 0) return;

    let importedCount = 0;
    for (const file of files) {
      const isAudio =
        (file.type && file.type.startsWith('audio/')) ||
        /\.(mp3|wav|m4a|ogg|aac|flac|opus|wma)$/i.test(file.name);

      if (!isAudio) continue;

      const meta = parseFilenameMetadata(file.name);
      const id = `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const track = {
        id,
        title: meta.title,
        artist: meta.artist,
        duration: 0,
        mimeType: file.type || 'audio/mpeg',
        addedAt: Date.now() + importedCount,
        blob: file
      };

      try {
        await putTrackToDB(track);
        state.tracks.unshift(track);
        importedCount += 1;
      } catch (err) {
        console.error('Gagal menyimpan file ke IndexedDB:', err);
      }
    }

    if (importedCount > 0) {
      applySearchFilter();
      refreshRecommendations(false);
      renderAll();
      if (!state.currentTrackId && state.tracks[0]) {
        state.currentTrackId = state.tracks[0].id;
        renderPlayerUI();
      }
      showToast(`${importedCount} lagu berhasil ditambahkan`);
    } else {
      showToast('Tidak ada file audio valid yang dipilih');
    }
  }

  function openEditModal(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    state.editingTrackId = track.id;
    dom.editTitleInput.value = track.title;
    dom.editArtistInput.value = track.artist;
    dom.editModal.classList.add('open');
    dom.editModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => dom.editTitleInput.focus(), 60);
  }

  function closeEditModal() {
    state.editingTrackId = null;
    dom.editModal.classList.remove('open');
    dom.editModal.setAttribute('aria-hidden', 'true');
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    const track = getTrackById(state.editingTrackId);
    if (!track) {
      closeEditModal();
      return;
    }

    const newTitle = dom.editTitleInput.value.trim();
    const newArtist = dom.editArtistInput.value.trim();
    if (!newTitle || !newArtist) {
      showToast('Judul dan artis wajib diisi');
      return;
    }

    track.title = newTitle;
    track.artist = newArtist;

    try {
      await putTrackToDB(track);
      if (state.currentTrackId === track.id) {
        updateMediaSessionMetadata(track);
      }
      closeEditModal();
      renderAll();
      showToast('Informasi lagu diperbarui');
    } catch (err) {
      console.error('Gagal mengedit lagu:', err);
      showToast('Gagal menyimpan perubahan');
    }
  }

  async function handleDeleteTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;

    const wasCurrent = state.currentTrackId === trackId;
    if (wasCurrent) {
      dom.audio.pause();
      dom.audio.removeAttribute('src');
      dom.audio.load();
      revokeCurrentObjectUrl();
      state.isPlaying = false;
      state.currentTrackId = null;
    }

    try {
      await deleteTrackFromDB(trackId);
      state.tracks = state.tracks.filter((t) => t.id !== trackId);
      delete state.stats.playCountsByTrack[trackId];
      await saveStatsToDB();

      if (wasCurrent && state.tracks.length > 0) {
        state.currentTrackId = state.tracks[0].id;
      }

      applySearchFilter();
      refreshRecommendations(false);
      renderAll();
      showToast('Lagu dihapus dari koleksi');
    } catch (err) {
      console.error('Gagal menghapus lagu:', err);
      showToast('Gagal menghapus lagu');
    }
  }

  function applySearchFilter() {
    const q = (dom.searchInput.value || '').trim().toLowerCase();
    dom.clearSearchBtn.classList.toggle('hidden', q.length === 0);

    if (!q) {
      state.filteredTracks = state.tracks.slice();
    } else {
      state.filteredTracks = state.tracks.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.artist || '').toLowerCase().includes(q)
      );
    }
    renderPlaylistPage();
  }

  function refreshRecommendations(showNotice = false) {
    const ids = state.tracks.map((t) => t.id);
    for (let i = ids.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    state.recommendedIds = ids.slice(0, 6);
    renderRecommendedTracks();
    if (showNotice) {
      showToast('Rekomendasi diperbarui');
    }
  }

  // ==================== NAVIGASI & MODAL NOW PLAYING ====================
  function switchTab(tabName) {
    if (!dom.pages[tabName]) return;
    state.activeTab = tabName;

    Object.entries(dom.pages).forEach(([key, el]) => {
      el.classList.toggle('active', key === tabName);
    });

    dom.navItems.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    if (tabName === 'saya') {
      renderStatsPage();
    }
  }

  function openNowPlaying() {
    if (!getActiveTrack()) {
      showToast('Pilih lagu terlebih dahulu');
      return;
    }
    if (!state.currentTrackId && state.tracks[0]) {
      state.currentTrackId = state.tracks[0].id;
    }
    renderPlayerUI();
    dom.nowPlayingModal.classList.add('open');
    dom.nowPlayingModal.setAttribute('aria-hidden', 'false');
  }

  function closeNowPlaying() {
    dom.nowPlayingModal.classList.remove('open');
    dom.nowPlayingModal.setAttribute('aria-hidden', 'true');
  }

  // ==================== RENDERING UI ====================
  function renderPlayerUI() {
    const active = getActiveTrack();
    const playing = state.isPlaying;
    const iconChar = playing ? '❚❚' : '▶';

    dom.heroSection.classList.toggle('is-playing', playing);
    dom.nowPlayingModal.classList.toggle('playing', playing);

    dom.heroPlayIcon.textContent = iconChar;
    dom.miniPlayBtn.textContent = iconChar;
    dom.npPlayBtn.textContent = iconChar;

    if (!active) {
      dom.heroTitle.textContent = 'Belum Ada Lagu Diputar';
      dom.heroArtist.textContent = 'Tambahkan musik lokal untuk mulai memutar';
      dom.heroDuration.textContent = '0:00';
      dom.heroPlayText.textContent = 'Putar Musik';

      dom.miniTitle.textContent = 'Tidak Ada Lagu';
      dom.miniArtist.textContent = 'ZAN MUSIC';
      dom.miniTime.textContent = '0:00 / 0:00';
      dom.miniProgressFill.style.width = '0%';

      dom.npTitle.textContent = 'Belum Ada Lagu';
      dom.npArtist.textContent = 'ZAN MUSIC';
      dom.npCurrentTime.textContent = '0:00';
      dom.npTotalTime.textContent = '0:00';
      dom.npSeekSlider.value = 0;
      return;
    }

    const dur = Number.isFinite(dom.audio.duration) && dom.audio.duration > 0
      ? dom.audio.duration
      : (active.duration || 0);
    const cur = state.currentTrackId === active.id ? (dom.audio.currentTime || 0) : 0;

    dom.heroTitle.textContent = active.title;
    dom.heroArtist.textContent = active.artist;
    dom.heroDuration.textContent = formatTime(dur);
    dom.heroPlayText.textContent = playing ? 'Jeda' : 'Putar';

    dom.miniTitle.textContent = active.title;
    dom.miniArtist.textContent = active.artist;
    dom.miniTime.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;

    const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
    dom.miniProgressFill.style.width = `${pct}%`;

    dom.npTitle.textContent = active.title;
    dom.npArtist.textContent = active.artist;
    dom.npCurrentTime.textContent = formatTime(cur);
    dom.npTotalTime.textContent = formatTime(dur);
    if (!state.isSeeking) {
      dom.npSeekSlider.value = pct;
    }
  }

  function renderFrequentTracks() {
    const counts = state.stats.playCountsByTrack || {};
    const ranked = state.tracks
      .slice()
      .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0) || (b.addedAt || 0) - (a.addedAt || 0))
      .slice(0, 8);

    dom.frequentTracks.innerHTML = '';
    if (ranked.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'muted-small';
      emptyNote.textContent = 'Belum ada riwayat lagu yang sering diputar.';
      dom.frequentTracks.appendChild(emptyNote);
      return;
    }

    const frag = document.createDocumentFragment();
    ranked.forEach((track) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'freq-card glass-card';
      if (state.currentTrackId === track.id && state.isPlaying) {
        btn.classList.add('playing');
      }

      const thumb = document.createElement('div');
      thumb.className = 'freq-thumb';
      thumb.textContent = state.currentTrackId === track.id && state.isPlaying ? '❚❚' : '♪';

      const title = document.createElement('div');
      title.className = 'freq-title truncate';
      title.textContent = track.title;

      const artist = document.createElement('div');
      artist.className = 'freq-artist truncate';
      artist.textContent = track.artist;

      btn.append(thumb, title, artist);
      btn.addEventListener('click', () => loadAndPlayTrack(track.id, true));
      frag.appendChild(btn);
    });

    dom.frequentTracks.appendChild(frag);
  }

  function renderRecommendedTracks() {
    const list = state.recommendedIds
      .map((id) => getTrackById(id))
      .filter(Boolean);

    dom.recommendedTracks.innerHTML = '';
    if (list.length === 0) {
      const note = document.createElement('div');
      note.className = 'muted-small';
      note.textContent = 'Impor musik di tab Playlist untuk melihat rekomendasi lokal.';
      dom.recommendedTracks.appendChild(note);
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((track) => {
      const isCurrentPlaying = state.currentTrackId === track.id && state.isPlaying;
      const row = document.createElement('div');
      row.className = 'track-row glass-card';
      if (isCurrentPlaying) row.classList.add('playing');

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'track-play-badge';
      playBtn.setAttribute('aria-label', `Putar ${track.title}`);
      playBtn.textContent = isCurrentPlaying ? '❚❚' : '▶';
      playBtn.addEventListener('click', () => {
        if (isCurrentPlaying) pausePlayback();
        else loadAndPlayTrack(track.id, true);
      });

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'track-details';
      info.addEventListener('click', () => loadAndPlayTrack(track.id, true));

      const tEl = document.createElement('div');
      tEl.className = 'track-title truncate';
      tEl.textContent = track.title;

      const aEl = document.createElement('div');
      aEl.className = 'track-sub truncate';
      aEl.textContent = track.artist;

      info.append(tEl, aEl);
      row.append(playBtn, info);
      frag.appendChild(row);
    });

    dom.recommendedTracks.appendChild(frag);
  }

  function renderPlaylistPage() {
    const total = state.tracks.length;
    const shown = state.filteredTracks.length;
    dom.playlistSubtitle.textContent =
      shown === total
        ? `${total} lagu tersimpan di perangkat`
        : `Menampilkan ${shown} dari ${total} lagu`;

    dom.emptyPlaylist.classList.toggle('hidden', total > 0);
    dom.playlistTracks.innerHTML = '';

    if (total === 0) return;

    if (shown === 0) {
      const noMatch = document.createElement('div');
      noMatch.className = 'muted-small';
      noMatch.textContent = 'Tidak ada lagu yang cocok dengan pencarian Anda.';
      dom.playlistTracks.appendChild(noMatch);
      return;
    }

    const frag = document.createDocumentFragment();
    state.filteredTracks.forEach((track) => {
      const isCurrentPlaying = state.currentTrackId === track.id && state.isPlaying;
      const row = document.createElement('div');
      row.className = 'track-row glass-card';
      if (isCurrentPlaying) row.classList.add('playing');

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'track-play-badge';
      playBtn.setAttribute('aria-label', `Putar ${track.title}`);
      playBtn.textContent = isCurrentPlaying ? '❚❚' : '▶';
      playBtn.addEventListener('click', () => {
        if (isCurrentPlaying) pausePlayback();
        else loadAndPlayTrack(track.id, true);
      });

      const info = document.createElement('button');
      info.type = 'button';
      info.className = 'track-details';
      info.addEventListener('click', () => loadAndPlayTrack(track.id, true));

      const titleEl = document.createElement('div');
      titleEl.className = 'track-title truncate';
      titleEl.textContent = track.title;

      const subEl = document.createElement('div');
      subEl.className = 'track-sub truncate';
      const durText = track.duration > 0 ? ` • ${formatTime(track.duration)}` : '';
      subEl.textContent = `${track.artist}${durText}`;

      info.append(titleEl, subEl);

      const actions = document.createElement('div');
      actions.className = 'track-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'action-mini-btn';
      editBtn.setAttribute('aria-label', `Edit ${track.title}`);
      editBtn.textContent = '✎';
      editBtn.addEventListener('click', () => openEditModal(track.id));

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'action-mini-btn delete';
      delBtn.setAttribute('aria-label', `Hapus ${track.title}`);
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => handleDeleteTrack(track.id));

      actions.append(editBtn, delBtn);
      row.append(playBtn, info, actions);
      frag.appendChild(row);
    });

    dom.playlistTracks.appendChild(frag);
  }

  function renderStatsPage() {
    const totalPlays = Number(state.stats.totalPlays) || 0;
    const totalTracks = state.tracks.length;

    const artistSet = new Set(
      state.tracks
        .map((t) => (t.artist || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const monthPrefix = getCurrentMonthPrefix();
    let monthPlays = 0;
    Object.entries(state.stats.dailyPlays || {}).forEach(([dateStr, count]) => {
      if (dateStr.startsWith(monthPrefix)) {
        monthPlays += Number(count) || 0;
      }
    });

    dom.statTotalPlays.textContent = String(totalPlays);
    dom.statTotalTracks.textContent = String(totalTracks);
    dom.statTotalArtists.textContent = String(artistSet.size);
    dom.statMonthPlays.textContent = String(monthPlays);

    // Grafik 7 Hari Terakhir
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const days = [];
    let maxCount = 1;
    let total7d = 0;

    for (let offset = -6; offset <= 0; offset += 1) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const key = getDateKey(offset);
      const val = Number((state.stats.dailyPlays || {})[key]) || 0;
      total7d += val;
      if (val > maxCount) maxCount = val;
      days.push({
        label: offset === 0 ? 'Hari Ini' : dayLabels[d.getDay()],
        val
      });
    }

    dom.chartTotal7d.textContent = `${total7d} putaran`;
    dom.weeklyChart.innerHTML = '';
    const chartFrag = document.createDocumentFragment();

    days.forEach((item) => {
      const col = document.createElement('div');
      col.className = 'chart-col';

      const valEl = document.createElement('span');
      valEl.className = 'chart-val';
      valEl.textContent = String(item.val);

      const barWrap = document.createElement('div');
      barWrap.className = 'chart-bar-wrap';

      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const heightPct = item.val > 0 ? Math.max(12, Math.round((item.val / maxCount) * 100)) : 6;
      bar.style.height = `${heightPct}%`;

      barWrap.appendChild(bar);

      const dayEl = document.createElement('span');
      dayEl.className = 'chart-day';
      dayEl.textContent = item.label;

      col.append(valEl, barWrap, dayEl);
      chartFrag.appendChild(col);
    });

    dom.weeklyChart.appendChild(chartFrag);

    // Lagu Paling Sering Diputar
    const counts = state.stats.playCountsByTrack || {};
    let bestTrack = null;
    let bestCount = 0;

    state.tracks.forEach((t) => {
      const c = Number(counts[t.id]) || 0;
      if (c > bestCount) {
        bestCount = c;
        bestTrack = t;
      }
    });

    if (bestTrack && bestCount > 0) {
      dom.topTrackTitle.textContent = bestTrack.title;
      dom.topTrackArtist.textContent = bestTrack.artist;
      dom.topTrackCount.textContent = `${bestCount}x`;
      dom.playTopTrackBtn.disabled = false;
      dom.playTopTrackBtn.onclick = () => loadAndPlayTrack(bestTrack.id, true);
    } else {
      dom.topTrackTitle.textContent = 'Belum ada data';
      dom.topTrackArtist.textContent = 'Putar lagu untuk melihat favoritmu';
      dom.topTrackCount.textContent = '0x';
      dom.playTopTrackBtn.disabled = true;
      dom.playTopTrackBtn.onclick = null;
    }
  }

  function renderTrackLists() {
    renderFrequentTracks();
    renderRecommendedTracks();
    renderPlaylistPage();
  }

  function renderAll() {
    renderPlayerUI();
    renderTrackLists();
    renderStatsPage();
  }

  // ==================== EVENT LISTENERS ====================
  function bindEvents() {
    // Bottom Navigation
    dom.navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        if (target) switchTab(target);
      });
    });

    // Tombol "Lihat Semua" di Halaman Musik
    document.querySelectorAll('[data-go-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.goTab;
        if (tab) switchTab(tab);
      });
    });

    // Impor Musik
    const triggerFilePicker = () => dom.musicFileInput.click();
    dom.quickImportBtn.addEventListener('click', triggerFilePicker);
    dom.addMusicBtn.addEventListener('click', triggerFilePicker);
    dom.emptyAddBtn.addEventListener('click', triggerFilePicker);
    dom.musicFileInput.addEventListener('change', (e) => handleFilesSelected(e.target.files));

    // Pencarian
    dom.searchInput.addEventListener('input', applySearchFilter);
    dom.clearSearchBtn.addEventListener('click', () => {
      dom.searchInput.value = '';
      applySearchFilter();
      dom.searchInput.focus();
    });

    // Acak Rekomendasi
    dom.refreshRecommendBtn.addEventListener('click', () => refreshRecommendations(true));

    // Kontrol Hero, Mini Player & Now Playing
    dom.heroPlayBtn.addEventListener('click', togglePlayPause);
    dom.heroExpandBtn.addEventListener('click', openNowPlaying);
    dom.heroArtBtn.addEventListener('click', openNowPlaying);

    dom.miniOpenFull.addEventListener('click', openNowPlaying);
    dom.miniPlayBtn.addEventListener('click', togglePlayPause);
    dom.miniPrevBtn.addEventListener('click', playPreviousTrack);
    dom.miniNextBtn.addEventListener('click', playNextTrack);

    dom.npCloseBtn.addEventListener('click', closeNowPlaying);
    dom.npPlayBtn.addEventListener('click', togglePlayPause);
    dom.npPrevBtn.addEventListener('click', playPreviousTrack);
    dom.npNextBtn.addEventListener('click', playNextTrack);

    dom.npEditBtn.addEventListener('click', () => {
      const active = getActiveTrack();
      if (active) openEditModal(active.id);
    });

    // Seek Slider Now Playing
    dom.npSeekSlider.addEventListener('input', () => {
      state.isSeeking = true;
      const dur = dom.audio.duration || 0;
      if (dur > 0) {
        const previewTime = (Number(dom.npSeekSlider.value) / 100) * dur;
        dom.npCurrentTime.textContent = formatTime(previewTime);
      }
    });

    dom.npSeekSlider.addEventListener('change', () => {
      const dur = dom.audio.duration || 0;
      if (dur > 0) {
        dom.audio.currentTime = (Number(dom.npSeekSlider.value) / 100) * dur;
        syncMediaPositionState();
      }
      state.isSeeking = false;
    });

    // Edit Modal
    dom.cancelEditBtn.addEventListener('click', closeEditModal);
    dom.editModal.addEventListener('click', (e) => {
      if (e.target === dom.editModal) closeEditModal();
    });
    dom.editTrackForm.addEventListener('submit', handleSaveEdit);

    // HTML5 Audio Events
    dom.audio.addEventListener('loadedmetadata', async () => {
      const active = getActiveTrack();
      if (active && Number.isFinite(dom.audio.duration) && dom.audio.duration > 0) {
        active.duration = dom.audio.duration;
        await putTrackToDB(active);
      }
      syncMediaPositionState();
      renderPlayerUI();
      renderPlaylistPage();
    });

    dom.audio.addEventListener('play', async () => {
      state.isPlaying = true;
      updateMediaSessionPlaybackState();
      syncMediaPositionState();
      renderPlayerUI();
      renderTrackLists();
      await recordTrackPlay(state.currentTrackId);
    });

    dom.audio.addEventListener('pause', () => {
      state.isPlaying = false;
      updateMediaSessionPlaybackState();
      syncMediaPositionState();
      renderPlayerUI();
      renderTrackLists();
    });

    dom.audio.addEventListener('timeupdate', () => {
      if (state.isSeeking) return;
      renderPlayerUI();
    });

    dom.audio.addEventListener('ended', async () => {
      state.isPlaying = false;
      updateMediaSessionPlaybackState();
      if (state.tracks.length > 1) {
        await playNextTrack();
      } else {
        dom.audio.currentTime = 0;
        renderPlayerUI();
        renderTrackLists();
      }
    });

    dom.audio.addEventListener('error', () => {
      state.isPlaying = false;
      updateMediaSessionPlaybackState();
      renderPlayerUI();
      renderTrackLists();
      showToast('Gagal memutar file audio');
    });

    // Bersihkan Object URL saat halaman ditutup
    window.addEventListener('pagehide', revokeCurrentObjectUrl);
    window.addEventListener('beforeunload', revokeCurrentObjectUrl);
  }

  // ==================== INISIALISASI ====================
  async function init() {
    setGreetingByTime();
    bindEvents();
    setupMediaSessionHandlers();

    try {
      await openDatabase();
      state.tracks = await loadAllTracksFromDB();
      state.stats = await loadStatsFromDB();
    } catch (err) {
      console.error('Inisialisasi penyimpanan lokal gagal:', err);
      state.tracks = [];
      state.stats = createDefaultStats();
      showToast('Penyimpanan lokal tidak tersedia');
    }

    state.filteredTracks = state.tracks.slice();
    refreshRecommendations(false);

    if (state.tracks.length > 0 && !state.currentTrackId) {
      state.currentTrackId = state.tracks[0].id;
      const firstTrack = state.tracks[0];
      const url = createTrackObjectUrl(firstTrack);
      if (url) {
        dom.audio.src = url;
        dom.audio.load();
      }
      updateMediaSessionMetadata(firstTrack);
    }

    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();