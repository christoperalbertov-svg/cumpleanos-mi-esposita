(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const config = window.BRENDA_CONFIG || {};

  // Menú pequeño, utilizable también con teclado.
  const menuButton = $('.menu-toggle');
  const navigation = $('#navigation');
  function closeMenu() {
    navigation.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menú');
  }
  menuButton.addEventListener('click', () => {
    const opened = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opened));
    menuButton.setAttribute('aria-label', opened ? 'Cerrar menú' : 'Abrir menú');
    navigation.classList.toggle('open', opened);
  });
  $$('#navigation a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  let toastTimer;
  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 4500);
  }

  // El contenido sigue siendo visible si el navegador no admite estas animaciones.
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          entry.target.classList.remove('will-reveal');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    $$('.reveal').forEach(element => {
      element.classList.add('will-reveal');
      observer.observe(element);
    });
  }

  // Una carta que sale de su sobre.
  const envelope = $('#envelope-scene');
  const letter = $('#love-letter');
  const openLetterButton = $('#open-letter');
  let letterIsOpening = false;
  function openLetter() {
    if (letterIsOpening || !letter.hidden) return;
    letterIsOpening = true;
    openLetterButton.disabled = true;
    openLetterButton.setAttribute('aria-expanded', 'true');
    envelope.classList.add('opening');
    setTimeout(() => {
      envelope.hidden = true;
      letter.hidden = false;
      letterIsOpening = false;
      letter.focus({ preventScroll: true });
      letter.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    }, reducedMotion.matches ? 0 : 650);
  }
  openLetterButton.addEventListener('click', openLetter);
  $('[data-open-letter]').addEventListener('click', openLetter);
  $('#close-letter').addEventListener('click', () => {
    letter.hidden = true;
    envelope.hidden = false;
    envelope.classList.remove('opening');
    openLetterButton.disabled = false;
    openLetterButton.setAttribute('aria-expanded', 'false');
    openLetterButton.focus({ preventScroll: true });
    envelope.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'center' });
  });

  // Un único sonido a la vez: dedicatoria con música y después melodía instrumental.
  // Ningún audio comienza sin pulsar uno de los botones de reproducción.
  const dedication = $('#dedication-audio');
  const background = $('#background-audio');
  if (config.dedicatoria) dedication.src = config.dedicatoria;
  if (config.musica) background.src = config.musica;
  let activeAudio = dedication;
  let playRequest = 0;
  const configuredVolume = Number(config.volumen);
  const initialVolume = Number.isFinite(configuredVolume) ? Math.min(1, Math.max(0, configuredVolume)) : 0.7;
  const volume = $('#volume');
  volume.value = String(initialVolume);
  dedication.volume = background.volume = initialVolume;
  const progress = $('#audio-progress');
  const timeLabel = $('#audio-time');
  const audioLabel = $('#audio-label');
  const dedicationButton = $('#dedication-play');
  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  function updateAudioUI() {
    const playing = !activeAudio.paused && !activeAudio.ended;
    $$('[data-audio-toggle]').forEach(button => {
      button.classList.toggle('is-playing', playing);
      button.setAttribute('aria-pressed', String(playing));
      button.setAttribute('aria-label', playing ? 'Pausar dedicatoria y música' : 'Reproducir dedicatoria y música');
    });
    const dedicationPlaying = activeAudio === dedication && playing;
    dedicationButton.classList.toggle('is-playing', dedicationPlaying);
    dedicationButton.setAttribute('aria-label', dedicationPlaying ? 'Pausar dedicatoria' : 'Escuchar la dedicatoria');
    $('use', dedicationButton).setAttribute('href', dedicationPlaying ? '#pause' : '#play');
    $('.audio-dedication').classList.toggle('is-playing', dedicationPlaying);
    audioLabel.textContent = dedicationPlaying ? 'Un mensaje para ti…' : activeAudio === background ? 'Volver a escuchar' : dedication.currentTime > 0 ? 'Continuar dedicatoria' : 'Escuchar dedicatoria';
    const duration = Number.isFinite(dedication.duration) ? dedication.duration : 91;
    timeLabel.textContent = `${formatTime(dedication.currentTime)} / ${formatTime(duration)}`;
    progress.value = String(duration ? dedication.currentTime / duration * 100 : 0);
  }
  async function startAudio(audio) {
    const request = ++playRequest;
    const other = audio === dedication ? background : dedication;
    other.pause();
    activeAudio = audio;
    if (!audio.getAttribute('src')) {
      toast('Esta melodía está esperando su momento. ♡');
      updateAudioUI();
      return;
    }
    try {
      await audio.play();
      if (request !== playRequest && activeAudio !== audio) audio.pause();
    } catch (error) {
      if (error.name !== 'AbortError') toast('Toca reproducir otra vez para escuchar nuestro audio.');
    }
    updateAudioUI();
  }
  $$('[data-audio-toggle]').forEach(button => button.addEventListener('click', () => {
    if (activeAudio.paused) startAudio(activeAudio);
    else { ++playRequest; activeAudio.pause(); updateAudioUI(); }
  }));
  dedicationButton.addEventListener('click', () => {
    if (activeAudio === dedication && !dedication.paused) {
      ++playRequest;
      dedication.pause();
    } else {
      if (dedication.ended || activeAudio !== dedication) dedication.currentTime = 0;
      startAudio(dedication);
    }
    updateAudioUI();
  });
  dedication.addEventListener('ended', () => {
    if (activeAudio === dedication && config.musica) startAudio(background);
    else updateAudioUI();
  });
  [dedication, background].forEach(audio => {
    ['play', 'pause', 'loadedmetadata', 'timeupdate'].forEach(name => audio.addEventListener(name, updateAudioUI));
    audio.addEventListener('error', () => {
      if (activeAudio === audio) {
        toast('No se pudo cargar el audio. Comprueba que conservaste la carpeta assets junto a index.html.');
        updateAudioUI();
      }
    });
  });
  progress.addEventListener('input', () => {
    if (Number.isFinite(dedication.duration)) dedication.currentTime = Number(progress.value) / 100 * dedication.duration;
    updateAudioUI();
  });
  volume.addEventListener('input', () => {
    dedication.volume = background.volume = Number(volume.value);
  });
  updateAudioUI();

  // Los ocho archivos de fotos y los diez videos reales del regalo.
  const photos = $$('[data-photo]').map(button => ({
    src: $('img', button).getAttribute('src'),
    alt: $('img', button).alt,
    caption: $('.photo-caption', button).textContent.replace('♡', '').trim()
  }));
  const videoCaptions = ['Siempre tan tú.', 'Me encantas en cada versión.', 'Mi niña bonita.', 'Esa mirada tuya…', 'Mi debilidad favorita.', 'Un ratito de tu magia.', 'Mi mundo en una persona.', 'Qué bonito que existas.', 'Cada detalle de ti.', 'Te volvería a elegir.'];
  const durations = [16, 6, 18, 13, 9, 9, 12, 11, 5, 4];
  const videos = videoCaptions.map((caption, index) => ({
    src: `assets/videos/video${index + 1}.mp4`,
    poster: `assets/posters/video${index + 1}.webp`,
    caption,
    alt: `Video ${index + 1} de Brenda`
  }));
  const videoGrid = $('#panel-videos');
  videos.forEach((video, index) => {
    const card = document.createElement('button');
    card.className = 'video-card';
    card.type = 'button';
    card.setAttribute('aria-label', `Ver video ${index + 1}: ${video.caption}`);
    card.innerHTML = `<img src="${video.poster}" alt="" loading="lazy" width="478" height="850"><span class="video-card-play" aria-hidden="true"><svg class="icon"><use href="#play"/></svg></span><span class="video-card-caption">${video.caption}</span><span class="video-duration" aria-hidden="true">${formatTime(durations[index])}</span>`;
    card.addEventListener('click', () => openMedia('video', index));
    videoGrid.append(card);
  });
  const tabs = $$('.album-tab');
  function selectTab(selected, focus = false) {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    });
    if (focus) selected.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') next = tabs[(index + 1) % tabs.length];
      else if (event.key === 'Home') next = tabs[0];
      else if (event.key === 'End') next = tabs[tabs.length - 1];
      if (next) { event.preventDefault(); selectTab(next, true); }
    });
  });

  const mediaDialog = $('#media-dialog');
  const stage = $('#media-stage');
  let mediaType = 'photo';
  let mediaIndex = 0;
  let lastMediaTrigger = null;
  function stopVideo() {
    const video = $('video', stage);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }
  function renderMedia() {
    stopVideo();
    stage.replaceChildren();
    const collection = mediaType === 'photo' ? photos : videos;
    const item = collection[mediaIndex];
    const element = document.createElement(mediaType === 'photo' ? 'img' : 'video');
    if (mediaType === 'photo') element.alt = item.alt;
    else {
      element.controls = true;
      element.muted = true;
      element.defaultMuted = true;
      element.playsInline = true;
      element.preload = 'metadata';
      element.poster = item.poster;
      element.setAttribute('aria-label', item.alt);
      element.setAttribute('muted', '');
      element.setAttribute('playsinline', '');
      element.addEventListener('error', () => toast('No se pudo abrir este recuerdo. Conserva la carpeta assets dentro del regalo.'));
    }
    element.src = item.src;
    stage.append(element);
    $('#media-caption').textContent = item.caption;
    $('#media-counter').textContent = `${mediaType === 'photo' ? 'FOTO' : 'VIDEO'} ${String(mediaIndex + 1).padStart(2, '0')} / ${String(collection.length).padStart(2, '0')}`;
    if (mediaType === 'video') element.play().catch(() => { /* Los controles permiten iniciar el video si el navegador lo requiere. */ });
  }
  function openMedia(type, index) {
    lastMediaTrigger = document.activeElement;
    mediaType = type;
    mediaIndex = index;
    renderMedia();
    mediaDialog.showModal();
    document.body.classList.add('modal-open');
  }
  function moveMedia(direction) {
    const count = mediaType === 'photo' ? photos.length : videos.length;
    mediaIndex = (mediaIndex + direction + count) % count;
    renderMedia();
  }
  $$('[data-photo]').forEach(button => button.addEventListener('click', () => openMedia('photo', Number(button.dataset.photo))));
  $('#media-prev').addEventListener('click', () => moveMedia(-1));
  $('#media-next').addEventListener('click', () => moveMedia(1));
  mediaDialog.addEventListener('keydown', event => {
    // No interceptar las flechas de los controles nativos del video.
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveMedia(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  mediaDialog.addEventListener('close', () => {
    stopVideo();
    document.body.classList.remove('modal-open');
    lastMediaTrigger?.focus({ preventScroll: true });
  });
  $$('dialog').forEach(dialog => {
    $('[data-close-dialog]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });

  const notes = [
    'Porque tu sonrisa tiene esa forma tan tuya de arreglarme el día.',
    'Porque contigo hasta una conversación sencilla se vuelve mi momento favorito.',
    'Porque eres hermosa, pero lo que más me enamora es todo lo que llevas dentro.',
    'Porque me ilusiona pensar en todo lo bonito que todavía podemos vivir.',
    'Porque no hay otra persona que tenga tu manera de ser. Y eso me encanta.',
    'Porque cuando pienso en un abrazo bonito, siempre imagino el tuyo.',
    'Porque quiero verte cumplir tus sueños y estar ahí para celebrar contigo.',
    'Porque mi corazón encuentra mil maneras de decir tu nombre.',
    'Porque en mis planes más bonitos siempre aparece un «contigo».',
    'Porque eres mi Brenda, mi esposita hermosa, y te amo con todo mi corazón.'
  ];
  let noteIndex = 0;
  let changingNote = false;
  $('#next-note').addEventListener('click', () => {
    if (changingNote) return;
    changingNote = true;
    noteIndex = (noteIndex + 1) % notes.length;
    const stack = $('.note-stack');
    stack.classList.add('changing');
    setTimeout(() => {
      $('#love-note').textContent = notes[noteIndex];
      $('#note-index').textContent = `UN PEDACITO DE MI AMOR / ${String(noteIndex + 1).padStart(2, '0')}`;
    }, reducedMotion.matches ? 0 : 140);
    setTimeout(() => { stack.classList.remove('changing'); changingNote = false; }, reducedMotion.matches ? 0 : 460);
  });

  // Velitas y confeti, sin cámara, micrófono ni servicios externos.
  const surpriseDialog = $('#surprise-dialog');
  const surpriseCake = $('#surprise-cake');
  const blowButton = $('#blow-candles');
  let blown = false;
  $('#open-surprise').addEventListener('click', () => {
    surpriseDialog.append(canvas);
    surpriseDialog.showModal();
    document.body.classList.add('modal-open');
  });
  surpriseDialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    stopConfetti();
    document.body.append(canvas);
    $('#open-surprise').focus({ preventScroll: true });
  });
  blowButton.addEventListener('click', () => {
    blown = !blown;
    surpriseCake.classList.toggle('blown', blown);
    if (blown) {
      $('#surprise-title').innerHTML = '¡Feliz cumpleaños,<br><em>mi esposita hermosa!</em>';
      $('#wish-message').textContent = 'Que este año te regale mucha alegría, sueños cumplidos y amor del bonito. Yo seguiré eligiéndote, Brenda. Te amo muchísimo. ♡';
      blowButton.textContent = 'Volver a encender las velitas ♡';
      celebrate();
    } else {
      $('#surprise-title').innerHTML = 'El deseo es tuyo.<br><em>Mi corazón también.</em>';
      $('#wish-message').innerHTML = 'Piensa en algo que te haga muy feliz…<br>y sopla estas velitas, mi amor.';
      blowButton.textContent = 'Soplar las velitas ♡';
      stopConfetti();
    }
  });
  const canvas = $('#confetti');
  const ctx = canvas.getContext('2d');
  let confettiFrame = 0;
  function stopConfetti() {
    cancelAnimationFrame(confettiFrame);
    confettiFrame = 0;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  function celebrate() {
    stopConfetti();
    if (!ctx || reducedMotion.matches) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const colors = ['#d6a67d', '#b77182', '#edc9be', '#fff1db', '#9c4862'];
    const particles = Array.from({ length: 120 }, () => ({
      x: width * (0.1 + Math.random() * 0.8), y: -Math.random() * height * 0.8,
      speed: 1.6 + Math.random() * 2.7, swing: Math.random() * Math.PI * 2,
      size: 4 + Math.random() * 6, rotation: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)], heart: Math.random() > 0.7
    }));
    let started;
    let previous;
    function draw(timestamp) {
      if (!started) started = timestamp;
      const delta = previous ? Math.min((timestamp - previous) / 16.67, 2) : 1;
      previous = timestamp;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.min(1, (6500 - (timestamp - started)) / 1200);
      particles.forEach(particle => {
        particle.y += particle.speed * delta;
        particle.x += Math.sin(particle.swing) * 0.8 * delta;
        particle.swing += 0.025 * delta;
        particle.rotation += 0.02 * delta;
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.fillStyle = particle.color;
        if (particle.heart) {
          const size = particle.size / 6;
          ctx.scale(size, size);
          ctx.beginPath();
          ctx.moveTo(0, 3);
          ctx.bezierCurveTo(-12, -4, -6, -12, 0, -6);
          ctx.bezierCurveTo(6, -12, 12, -4, 0, 3);
          ctx.fill();
        } else ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.6);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      if (timestamp - started < 6500) confettiFrame = requestAnimationFrame(draw);
      else stopConfetti();
    }
    confettiFrame = requestAnimationFrame(draw);
  }
  window.addEventListener('resize', stopConfetti);
})();
