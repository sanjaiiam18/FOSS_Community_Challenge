/**
 * THE ROAD TO THE KINGDOM — THIRUKKURAL 550
 * Pure Vanilla JavaScript: 2D Cinematic Camera, Parallax Director,
 * Story State Machine, Procedural Web Audio API & Organic Canvas FX.
 */

(function () {
  'use strict';

  // --- Story Chapters & Camera Landmarks ---
  const CHAPTERS = [
    { targetX: 0, title: 'PROLOGUE : THE DAWN PATH', state: 'state-dawn' },
    { targetX: 1350, title: 'ACT I : THE PADDY FIELD', state: 'state-weed' },
    { targetX: 2000, title: 'ACT II : THE WEED EXCISED', state: 'state-flourish' },
    { targetX: 4400, title: 'ACT III : THE KINGDOM SQUARE', state: 'state-kingdom' },
    { targetX: 5200, title: 'ACT IV : SOVEREIGN JUSTICE', state: 'state-justice' },
    { targetX: 6200, title: 'EPILOGUE : THIRUKKURAL 550', state: 'state-kural' }
  ];

  const WORLD_MAX_X = 6400;

  // --- Core State Variables ---
  let cameraX = 0;
  let targetCameraX = 0;
  let lastCameraX = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartCam = 0;

  // Story Trigger Flags
  let weedRemoved = false;
  let disturbanceTriggered = false;
  let justiceTriggered = false;
  let mirrorRevealed = false;
  let kuralRevealed = false;

  // DOM Elements
  const bodyEl = document.body;
  const worldViewport = document.getElementById('world-viewport');
  const cameraWorld = document.getElementById('camera-world');
  const parallaxLayers = document.querySelectorAll('.parallax-layer');
  const travelerHero = document.getElementById('traveler-hero');
  const walkDust = document.getElementById('walk-dust');
  const hudChapter = document.getElementById('hud-chapter');
  const scrubSteps = document.querySelectorAll('.scrub-step');
  const whisperEl = document.getElementById('whisper-text');
  const weedEl = document.getElementById('weed-element');
  const farmerEl = document.getElementById('farmer-actor');
  const cropsContainer = document.getElementById('crops-container');
  const citizensGroup = document.getElementById('citizens-group');
  const offendersGroup = document.getElementById('offenders-group');
  const rulerArmPath = document.getElementById('ruler-arm-path');
  const modalMirror = document.getElementById('modal-mirror');
  const modalKural = document.getElementById('modal-kural');
  const btnProceedKural = document.getElementById('btn-proceed-kural');
  const btnReplay = document.getElementById('btn-replay');
  const btnAudio = document.getElementById('btn-audio');
  const audioLabel = document.getElementById('audio-label');

  // Canvases
  const canvasParticles = document.getElementById('canvas-particles');
  const ctxParticles = canvasParticles ? canvasParticles.getContext('2d') : null;
  const canvasSoil = document.getElementById('canvas-soil-fx');
  const ctxSoil = canvasSoil ? canvasSoil.getContext('2d') : null;

  // ==========================================================================
  // PROCEDURAL WEB AUDIO SYNTHESIZER
  // ==========================================================================
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.windNode = null;
      this.windGain = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.setupWindAmbience();
    }

    setupWindAmbience() {
      if (!this.ctx) return;
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.11;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;

      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.04;

      noise.connect(filter);
      filter.connect(this.windGain);
      this.windGain.connect(this.ctx.destination);
      noise.start();
    }

    toggle() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.enabled = !this.enabled;
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(this.enabled ? 0.06 : 0, this.ctx.currentTime, 0.2);
      }
      return this.enabled;
    }

    playChime(freq = 528, duration = 1.8) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + duration);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    }

    playTensionDrone() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(82, now);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 2.5);
    }

    playStep() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  const sound = new SoundEngine();

  // ==========================================================================
  // INITIALIZE CROPS & VISUAL ASSETS
  // ==========================================================================
  function generateCrops() {
    if (!cropsContainer) return;
    cropsContainer.innerHTML = '';
    const numCrops = 26;

    for (let i = 0; i < numCrops; i++) {
      const isNearWeed = i >= 8 && i <= 14;
      const crop = document.createElement('div');
      crop.className = 'crop-plant' + (isNearWeed ? ' choked' : '');
      crop.innerHTML = `
        <svg viewBox="0 0 48 165" width="100%" height="100%">
          <path d="M 24 165 Q 22 90 ${20 + (i % 5)} 20" stroke="#16a34a" stroke-width="5" stroke-linecap="round" fill="none"/>
          <path d="M 24 110 Q 8 80 5 60" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <path d="M 24 90 Q 38 65 40 45" stroke="#22c55e" stroke-width="3.5" stroke-linecap="round" fill="none"/>
          <ellipse cx="${20 + (i % 5)}" cy="18" rx="4.5" ry="11" fill="#facc15"/>
          <ellipse cx="6" cy="58" rx="3.5" ry="8" fill="#eab308"/>
          <ellipse cx="39" cy="43" rx="3.5" ry="8" fill="#eab308"/>
        </svg>
      `;
      cropsContainer.appendChild(crop);
    }
  }

  // ==========================================================================
  // ATMOSPHERIC PARTICLES
  // ==========================================================================
  const particles = [];
  function initParticles() {
    if (!canvasParticles) return;
    canvasParticles.width = window.innerWidth;
    canvasParticles.height = window.innerHeight;

    particles.length = 0;
    const count = window.innerWidth < 768 ? 35 : 75;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvasParticles.width,
        y: Math.random() * canvasParticles.height,
        r: Math.random() * 2.2 + 0.8,
        vx: Math.random() * 0.4 - 0.2 + 0.15,
        vy: Math.random() * 0.3 - 0.15,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  function renderParticles() {
    if (!ctxParticles || !canvasParticles) return;
    ctxParticles.clearRect(0, 0, canvasParticles.width, canvasParticles.height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = canvasParticles.width;
      if (p.x > canvasParticles.width) p.x = 0;
      if (p.y < 0) p.y = canvasParticles.height;
      if (p.y > canvasParticles.height) p.y = 0;

      ctxParticles.beginPath();
      ctxParticles.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctxParticles.fillStyle = 'rgba(255, 235, 180, ' + p.alpha + ')';
      ctxParticles.fill();
    }
  }

  // ==========================================================================
  // SOIL PARTICULATE EXPLOSION
  // ==========================================================================
  const soilParticles = [];
  function triggerSoilExplosion(originX, originY) {
    if (!canvasSoil) return;
    canvasSoil.width = canvasSoil.parentElement.clientWidth;
    canvasSoil.height = canvasSoil.parentElement.clientHeight;

    for (let i = 0; i < 40; i++) {
      soilParticles.push({
        x: originX || 550,
        y: originY || 240,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 7 - 2,
        r: Math.random() * 4 + 2,
        color: Math.random() > 0.4 ? '#4ade80' : '#8a5d3b',
        alpha: 1
      });
    }
  }

  function renderSoilParticles() {
    if (!ctxSoil || !canvasSoil || soilParticles.length === 0) return;
    ctxSoil.clearRect(0, 0, canvasSoil.width, canvasSoil.height);

    for (let i = soilParticles.length - 1; i >= 0; i--) {
      const p = soilParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.22;
      p.alpha -= 0.022;

      if (p.alpha <= 0) {
        soilParticles.splice(i, 1);
        continue;
      }

      ctxSoil.beginPath();
      ctxSoil.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctxSoil.fillStyle = p.color;
      ctxSoil.globalAlpha = p.alpha;
      ctxSoil.fill();
    }
    ctxSoil.globalAlpha = 1;
  }

  // ==========================================================================
  // NARRATIVE WHISPER SYSTEM
  // ==========================================================================
  let whisperTimeout = null;
  function showWhisper(text, duration = 4000) {
    if (!whisperEl) return;
    if (whisperTimeout) clearTimeout(whisperTimeout);

    whisperEl.classList.remove('visible');
    setTimeout(() => {
      whisperEl.textContent = text;
      whisperEl.classList.add('visible');

      whisperTimeout = setTimeout(() => {
        whisperEl.classList.remove('visible');
      }, duration);
    }, 300);
  }

  // ==========================================================================
  // WEED REMOVAL ACTION (MILESTONE 2)
  // ==========================================================================
  function executeWeedRemoval() {
    if (weedRemoved) return;
    weedRemoved = true;

    if (farmerEl) {
      farmerEl.classList.add('farmer-posture-pulling');
      setTimeout(() => {
        farmerEl.classList.remove('farmer-posture-pulling');
        farmerEl.classList.add('farmer-posture-standing');
      }, 1400);
    }

    if (weedEl) {
      weedEl.classList.add('removed');
      triggerSoilExplosion(550, 260);
    }

    sound.playChime(440, 2.2);

    setTimeout(() => {
      const crops = document.querySelectorAll('.crop-plant');
      crops.forEach(c => {
        c.classList.remove('choked');
        c.classList.add('healed');
      });

      bodyEl.className = 'state-flourish';
      showWhisper('He removed one. The whole field could breathe again.', 4500);
    }, 600);
  }

  // ==========================================================================
  // KINGDOM DISTURBANCE & JUSTICE ACTION (MILESTONE 4)
  // ==========================================================================
  function triggerDisturbance() {
    if (disturbanceTriggered) return;
    disturbanceTriggered = true;

    bodyEl.className = 'state-tense';
    if (citizensGroup) citizensGroup.classList.add('frightened');
    sound.playTensionDrone();
    showWhisper('Harmful offenders disturbed the peace of the innocent...', 4000);
  }

  function executeJusticeIntervention() {
    if (justiceTriggered) return;
    justiceTriggered = true;

    if (rulerArmPath) {
      rulerArmPath.setAttribute('d', 'M 38 60 Q 5 40 -15 45');
    }

    setTimeout(() => {
      if (offendersGroup) offendersGroup.classList.add('escorted');
      
      const kingdomOuterWalls = document.querySelector('.kingdom-outer-walls');
      if (kingdomOuterWalls) kingdomOuterWalls.classList.add('gates-closed');

      sound.playChime(587, 2.5);

      setTimeout(() => {
        bodyEl.className = 'state-justice';
        if (citizensGroup) {
          citizensGroup.classList.remove('frightened');
          citizensGroup.classList.add('recovered');
        }
        showWhisper('The ruler removed the harm... so society could flourish.', 4500);
      }, 800);
    }, 600);
  }

  // ==========================================================================
  // MILESTONE 5 & 6: MIRROR REVEAL & THIRUKKURAL 550
  // ==========================================================================
  function openMirrorModal() {
    if (mirrorRevealed) return;
    mirrorRevealed = true;
    if (modalMirror) modalMirror.classList.remove('hidden');
    sound.playChime(659, 2.2);
  }

  function openKuralClimax() {
    if (kuralRevealed) return;
    initEmbers();
    kuralRevealed = true;
    if (modalMirror) modalMirror.classList.add('hidden');
    if (modalKural) modalKural.classList.remove('hidden');
    bodyEl.className = 'state-kural';
    sound.playChime(880, 3.0);
  }

  function resetJourney() {
    weedRemoved = false;
    disturbanceTriggered = false;
    justiceTriggered = false;
    mirrorRevealed = false;
    kuralRevealed = false;

    if (modalMirror) modalMirror.classList.add('hidden');
    if (modalKural) modalKural.classList.add('hidden');

    generateCrops();
    if (weedEl) weedEl.classList.remove('removed');
    if (farmerEl) {
      farmerEl.className = 'farmer-actor';
    }
    if (citizensGroup) {
      citizensGroup.className = 'citizens-group';
    }
    if (offendersGroup) {
      offendersGroup.classList.remove('escorted');
    }
    if (rulerArmPath) {
      rulerArmPath.setAttribute('d', 'M 38 60 Q 15 75 5 80');
    }

    targetCameraX = 0;
    cameraX = 0;
    bodyEl.className = 'state-dawn';
    showWhisper('A traveler began walking toward the kingdom...', 4000);
  }

  // ==========================================================================
  // STORYLINE TIMELINE DIRECTOR
  // ==========================================================================
  function checkStoryTriggers(x) {
    let currentChapter = CHAPTERS[0];
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (x >= CHAPTERS[i].targetX - 250) {
        currentChapter = CHAPTERS[i];
      }
    }

    if (hudChapter) hudChapter.textContent = currentChapter.title;

    scrubSteps.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      
      // If intro is open, close it
      if (introScreen && !introScreen.classList.contains('hidden')) {
        introScreen.classList.add('hidden');
      }

      if (target === 0) {
        resetJourney();
        return;
      }

      // Close modals if jumping to earlier points
      if (target < 5800) {
        if (modalMirror) modalMirror.classList.add('hidden');
        if (modalKural) modalKural.classList.add('hidden');
        mirrorRevealed = false;
        kuralRevealed = false;
      }

      if (target >= 1800) {
        executeWeedRemoval();
      }

      if (target >= 4700) {
        triggerDisturbance();
      }

      if (target >= 5200) {
        executeJusticeIntervention();
      }

      if (target >= 6200) {
        openKuralClimax();
      }

      targetCameraX = target;
    });
  });

    if (x < 600 && !weedRemoved && !disturbanceTriggered) {
      if (bodyEl.className !== 'state-dawn') bodyEl.className = 'state-dawn';
    }

    if (x >= 800 && x < 2400 && !weedRemoved) {
      if (bodyEl.className !== 'state-weed') {
        bodyEl.className = 'state-weed';
        showWhisper('Among the green shoots, a choking weed grew...', 3500);
      }
      if (x >= 1800) {
        executeWeedRemoval();
      }
    }

    if (x >= 3200 && x < 4600 && weedRemoved && !disturbanceTriggered) {
      if (bodyEl.className !== 'state-kingdom') {
        bodyEl.className = 'state-kingdom';
        showWhisper('Beyond the country road lay the fortress of the king.', 3500);
      }
    }

    if (x >= 4700 && !disturbanceTriggered) {
      triggerDisturbance();
    }

    if (x >= 5200 && disturbanceTriggered && !justiceTriggered) {
      executeJusticeIntervention();
    }

    if (x >= 5900 && justiceTriggered && !mirrorRevealed) {
      openMirrorModal();
    }
  }

  // ==========================================================================
  // INPUT CONTROLLER
  // ==========================================================================
  function moveCameraBy(delta) {
    targetCameraX += delta;
    if (targetCameraX < 0) targetCameraX = 0;
    if (targetCameraX > WORLD_MAX_X) targetCameraX = WORLD_MAX_X;
  }

  window.addEventListener('wheel', (e) => {
    if (introScreen && !introScreen.classList.contains('hidden')) return;
    if (mirrorRevealed && modalMirror && !modalMirror.classList.contains('hidden')) return;
    if (kuralRevealed && modalKural && !modalKural.classList.contains('hidden')) return;
    const delta = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 1.6;
    moveCameraBy(delta);
  }, { passive: true });

  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button') || e.target.closest('.modal-mirror') || e.target.closest('.modal-kural')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartCam = targetCameraX;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const diff = (dragStartX - e.clientX) * 1.8;
    targetCameraX = dragStartCam + diff;
    if (targetCameraX < 0) targetCameraX = 0;
    if (targetCameraX > WORLD_MAX_X) targetCameraX = WORLD_MAX_X;
  });

  window.addEventListener('pointerup', () => {
    isDragging = false;
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'KeyD') {
      moveCameraBy(120);
    } else if (e.key === 'ArrowLeft' || e.key === 'KeyA') {
      moveCameraBy(-120);
    }
  });

  scrubSteps.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseInt(btn.getAttribute('data-target'), 10);
      targetCameraX = target;
    });
  });

  if (weedEl) {
    weedEl.addEventListener('click', executeWeedRemoval);
  }

  if (btnProceedKural) {
    btnProceedKural.addEventListener('click', openKuralClimax);
  }

  if (btnReplay) {
    btnReplay.addEventListener('click', resetJourney);
  }

  if (btnAudio) {
    btnAudio.addEventListener('click', () => {
      const isOn = sound.toggle();
      btnAudio.classList.toggle('active', isOn);
      if (audioLabel) audioLabel.textContent = isOn ? 'SOUND : ON' : 'SOUND : OFF';
    });
  }

  let stepTimer = 0;
  function spawnDustPuff() {
    if (!walkDust) return;
    const p = document.createElement('div');
    p.className = 'dust-particle';
    walkDust.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }

  // ==========================================================================
  // APPLY URL HASH OR DEEP-LINK
  // ==========================================================================
  function applyHashNavigation() {
    const rawHash = window.location.hash.replace('#', '').toLowerCase();
    if (!rawHash) return;

    if (introScreen) {
      introScreen.classList.add('hidden');
    }

    if (rawHash === 'dawn') {
      targetCameraX = cameraX = 0;
      bodyEl.className = 'state-dawn';
    } else if (rawHash === 'farm' || rawHash === 'weed') {
      targetCameraX = cameraX = 1350;
      bodyEl.className = 'state-weed';
    } else if (rawHash === 'flourish') {
      targetCameraX = cameraX = 1350;
      executeWeedRemoval();
    } else if (rawHash === 'kingdom') {
      targetCameraX = cameraX = 4400;
      weedRemoved = true;
      bodyEl.className = 'state-kingdom';
    } else if (rawHash === 'disturb') {
      targetCameraX = cameraX = 4800;
      weedRemoved = true;
      triggerDisturbance();
    } else if (rawHash === 'justice') {
      targetCameraX = cameraX = 5200;
      weedRemoved = true;
      triggerDisturbance();
      executeJusticeIntervention();
    } else if (rawHash === 'mirror') {
      targetCameraX = cameraX = 5900;
      weedRemoved = true;
      disturbanceTriggered = true;
      justiceTriggered = true;
      openMirrorModal();
    } else if (rawHash === 'kural') {
      targetCameraX = cameraX = 6200;
      weedRemoved = true;
      disturbanceTriggered = true;
      justiceTriggered = true;
      mirrorRevealed = true;
      openKuralClimax();
    } else if (!isNaN(parseInt(rawHash, 10))) {
      targetCameraX = cameraX = parseInt(rawHash, 10);
    }
  }

  window.addEventListener('hashchange', applyHashNavigation);

  // ==========================================================================
  // MAIN ANIMATION LOOP (60 FPS REQUESTANIMATIONFRAME)
  // ==========================================================================
  function animate() {
    cameraX += (targetCameraX - cameraX) * 0.085;

    const velocity = Math.abs(cameraX - lastCameraX);
    const isWalking = velocity > 0.45;

    if (travelerHero) {
      if (isWalking) {
        travelerHero.classList.add('traveler-walking');
        stepTimer++;
        if (stepTimer % 18 === 0) {
          spawnDustPuff();
          sound.playStep();
        }
      } else {
        travelerHero.classList.remove('traveler-walking');
      }
    }

    lastCameraX = cameraX;

    if (cameraWorld) {
      cameraWorld.style.transform = 'translate3d(' + (-cameraX) + 'px, 0, 0)';
    }

    parallaxLayers.forEach(layer => {
      const speed = parseFloat(layer.getAttribute('data-speed')) || 1.0;
      layer.style.transform = 'translate3d(' + (-cameraX * (speed - 1)) + 'px, 0, 0)';
    });

    checkStoryTriggers(cameraX);

    renderParticles();
    renderSoilParticles();
    renderEmbers();

    requestAnimationFrame(animate);
  }


  // ==========================================================================
  // FLOATING GOLDEN EMBERS ON KURAL CLIMAX
  // ==========================================================================
  const canvasEmbers = document.getElementById('canvas-kural-embers');
  const ctxEmbers = canvasEmbers ? canvasEmbers.getContext('2d') : null;
  const embers = [];

  function initEmbers() {
    if (!canvasEmbers) return;
    canvasEmbers.width = window.innerWidth;
    canvasEmbers.height = window.innerHeight;
    embers.length = 0;
    const count = window.innerWidth < 768 ? 25 : 55;
    for (let i = 0; i < count; i++) {
      embers.push({
        x: Math.random() * canvasEmbers.width,
        y: Math.random() * canvasEmbers.height,
        r: Math.random() * 2.5 + 1.0,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.25,
        alpha: Math.random() * 0.6 + 0.2
      });
    }
  }

  function renderEmbers() {
    if (!ctxEmbers || !canvasEmbers || !kuralRevealed) return;
    ctxEmbers.clearRect(0, 0, canvasEmbers.width, canvasEmbers.height);

    for (let i = 0; i < embers.length; i++) {
      const e = embers[i];
      e.x += e.vx;
      e.y += e.vy;

      if (e.y < -10) e.y = canvasEmbers.height + 10;
      if (e.x < 0) e.x = canvasEmbers.width;
      if (e.x > canvasEmbers.width) e.x = 0;

      ctxEmbers.beginPath();
      ctxEmbers.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctxEmbers.fillStyle = 'rgba(251, 191, 36, ' + e.alpha + ')';
      ctxEmbers.fill();
    }
  }


  // ==========================================================================
  // ACTIONABLE KURAL CLIMAX: CHANTING, SCHOLAR COMMENTARIES & WORD SPOTLIGHT
  // ==========================================================================
  const COMMENTARIES = {
    core: {
      eyebrow: 'THE CORE METAPHOR • மையக் கருத்து',
      body: '“For a ruler to remove and punish those who inflict grievous harm upon society is precisely comparable to a farmer uprooting parasitic weeds so that the green, flourishing crops may live.”',
      highlight: 'Protect the whole by excising what destroys it.',
      detail: 'Justice is not vengeance; it is the ultimate agrarian responsibility of life-giving care.'
    },
    muva: {
      eyebrow: 'மு. வரதராசனார் உரை (DR. M. VARADARAJANAR)',
      body: '“கொடிய வழியில் பிறருக்குத் துன்பம் செய்யும் தீயோரை அரசன் தண்டித்து நீக்குதல், வளர்ந்து வரும் இளம்பயிரின் நடுவே முளைத்திருக்கும் நச்சுக்களைகளைப் பிடுங்கி எறிவதற்கு நிகரான அறச்செயலாகும்.”',
      highlight: 'சமுதாய நலம் காக்க நச்சுக் களைகளை அகற்றுதல் அரச நீதி.',
      detail: 'பயிரைக் காக்கும் உழவன் போல், மக்களைக் காப்பவனே நல்ல வேந்தன்.'
    },
    pappaiah: {
      eyebrow: 'சாலமன் பாப்பையா உரை (SOLOMON PAPPAIAH)',
      body: '“நாட்டு மக்களுக்குக் கேடு செய்யும் கொடியவர்களை அரசன் தண்டித்து ஒதுக்குவது, இளம் நெற்பயிரைக் காக்க உழவன் களை எடுப்பது போன்ற இன்றியமையாத கடமையாகும்.”',
      highlight: 'தண்டனை என்பது பழிவாங்குதல் அல்ல; அது பாதுகாத்தல்.',
      detail: 'களை எடுக்காவிட்டால் பயிர் அழியும்; கொடியாரை நீக்காவிட்டால் சமுதாயம் அழியும்.'
    },
    pope: {
      eyebrow: 'REV. DR. G.U. POPE CLASSICAL ENGLISH COMMENTARY',
      body: '“For kings to execute or excise men of cruel and murderous intent is just as when the watchful husbandman plucks the noxious weed from out the tender blade.”',
      highlight: 'The severe surgery of the state is identical to agricultural preservation.',
      detail: 'Thiruvalluvar harmonizes the ethics of Ahimsa with sovereign duty: compassion for the crop demands the removal of the parasite.'
    }
  };

  const WORD_SPOTLIGHTS = {
    king: {
      title: 'வேந்தொறுத்தல் (Sovereign Duty)',
      body: 'The righteous monarch (வேந்து) exercising state discipline (ஒறுத்தல்). Valluvar frames punishment not as cruelty, but as the unavoidable burden of stewardship to preserve collective life.'
    },
    threat: {
      title: 'கொலையிற் கொடியாரை (The Parasitic Hazard)',
      body: 'Those whose sustained malice or cruelty deprives innocent people of peace. They are not merely flawed citizens; their parasitic behavior directly starves the living community.'
    },
    crop: {
      title: 'பைங்கூழ் களைகட்டதனொடு (Uprooting the Weed)',
      body: 'Young, tender green crops (பைங்கூழ்) suffocated by wild weeds (களை). The farmer removes the weed with exact discrimination—never injuring the healthy stalk beside it.'
    },
    equal: {
      title: 'நேர் (Sacred Equivalence)',
      body: 'The word “நேர்” declares an absolute, timeless equivalence. Natural agrarian law and civic moral philosophy are one and the same: to protect the whole, you must excise the poison.'
    }
  };

  
  // ==========================================================================
  // MILESTONE 0: STORYBOOK COVER INTERACTION & POINTER PARALLAX
  // ==========================================================================
  const introScreen = document.getElementById('intro-screen');
  const btnBeginJourney = document.getElementById('btn-begin-journey');
  const btnHudCover = document.getElementById('btn-hud-cover');
  const canvasIntroDust = document.getElementById('canvas-intro-dust');
  const ctxIntroDust = canvasIntroDust ? canvasIntroDust.getContext('2d') : null;
  const introDustMotes = [];

  function initIntroDust() {
    if (!canvasIntroDust) return;
    canvasIntroDust.width = window.innerWidth;
    canvasIntroDust.height = window.innerHeight;
    introDustMotes.length = 0;
    const count = window.innerWidth < 768 ? 20 : 45;
    for (let i = 0; i < count; i++) {
      introDustMotes.push({
        x: Math.random() * canvasIntroDust.width,
        y: Math.random() * canvasIntroDust.height,
        r: Math.random() * 2.2 + 0.8,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.45 - 0.15,
        alpha: Math.random() * 0.5 + 0.2
      });
    }
  }

  function renderIntroDust() {
    if (!ctxIntroDust || !canvasIntroDust || !introScreen || introScreen.classList.contains('hidden')) return;
    ctxIntroDust.clearRect(0, 0, canvasIntroDust.width, canvasIntroDust.height);

    for (let i = 0; i < introDustMotes.length; i++) {
      const p = introDustMotes[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) p.y = canvasIntroDust.height + 10;
      if (p.x < 0) p.x = canvasIntroDust.width;
      if (p.x > canvasIntroDust.width) p.x = 0;

      ctxIntroDust.beginPath();
      ctxIntroDust.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctxIntroDust.fillStyle = 'rgba(197, 155, 39, ' + p.alpha + ')';
      ctxIntroDust.fill();
    }

    requestAnimationFrame(renderIntroDust);
  }

  function setupIntroScreen() {
    if (!introScreen) return;
    initIntroDust();
    renderIntroDust();
    window.addEventListener('resize', initIntroDust);

    // Pointer / Touch subtle parallax
    window.addEventListener('pointermove', (e) => {
      if (introScreen.classList.contains('hidden')) return;
      const xNorm = e.clientX / window.innerWidth;
      const yNorm = e.clientY / window.innerHeight;

      introScreen.style.setProperty('--mouse-x', (xNorm * 100).toFixed(1) + '%');
      introScreen.style.setProperty('--mouse-y', (yNorm * 100).toFixed(1) + '%');
      introScreen.style.setProperty('--mouse-x-num', xNorm.toFixed(3));
      introScreen.style.setProperty('--mouse-y-num', yNorm.toFixed(3));
    });

    // Begin Journey transition
    if (btnBeginJourney) {
      btnBeginJourney.addEventListener('click', () => {
        sound.init();
        if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();
        sound.playChime(528, 2.0);

        introScreen.classList.add('transitioning-out');

        setTimeout(() => {
          introScreen.classList.add('hidden');
          introScreen.classList.remove('transitioning-out');
          bodyEl.className = 'state-dawn';
          showWhisper('A traveler began walking toward the kingdom...', 4500);
        }, 1100);
      });
    }

    // Return to cover from HUD button
    if (btnHudCover) {
      btnHudCover.addEventListener('click', () => {
        resetJourney();
        introScreen.classList.remove('hidden', 'transitioning-out');
        bodyEl.className = 'state-intro';
      });
    }
  }

  function setupClimaxActions() {
    const btnChant = document.getElementById('btn-chant-kural');
    const scholarPills = document.querySelectorAll('.scholar-pill');
    const metaTabs = document.querySelectorAll('.meta-tab');
    const breakCells = document.querySelectorAll('.break-cell');
    const kuralWords = document.querySelectorAll('.kural-word');
    const commEyebrow = document.getElementById('commentary-eyebrow');
    const commBody = document.getElementById('commentary-body');
    const commHighlight = document.querySelector('.comm-highlight');
    const commDetail = document.querySelector('.comm-detail');
    const modalKural = document.getElementById('modal-kural');
    const btnToggleParallels = document.getElementById('btn-toggle-parallels');
    const parallelsGrid = document.getElementById('parallels-grid');

    // Helper: Select Word & Sync Poem + Matrix Card
    function selectWord(wordKey) {
      breakCells.forEach(c => {
        if (c.getAttribute('data-word') === wordKey) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });

      kuralWords.forEach(w => {
        if (w.getAttribute('data-word') === wordKey) {
          w.classList.add('highlighted');
        } else {
          w.classList.remove('highlighted');
        }
      });

      const info = WORD_SPOTLIGHTS[wordKey];
      if (info && commBody && commEyebrow) {
        commEyebrow.textContent = 'WORD SPOTLIGHT • ' + info.title;
        commBody.textContent = info.body;
        if (commHighlight) commHighlight.textContent = 'Interactive Etymology & Meaning';
        if (commDetail) commDetail.textContent = 'Click other words or cards to compare their philosophical roles.';
      }
    }

    // 1. Audio Chanting Melodic Synthesizer with Synchronized Couplet Karaoke
    if (btnChant) {
      btnChant.addEventListener('click', () => {
        sound.init();
        if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume();
        btnChant.classList.toggle('chanting');

        if (btnChant.classList.contains('chanting')) {
          // Play rhythmic melodic chant of Kural 550 syllables
          // Phase 1: Threat (0s - 1.5s)
          // Phase 2: King (1.5s - 3.2s)
          // Phase 3: Crop (3.2s - 4.8s)
          // Phase 4: Equal (4.8s - 6.5s)
          const notes = [
            { f: 293.66, d: 0.35, pause: 0.08, word: 'threat' }, // கொ
            { f: 329.63, d: 0.35, pause: 0.08, word: 'threat' }, // லை
            { f: 392.00, d: 0.50, pause: 0.12, word: 'threat' }, // யிற்
            { f: 329.63, d: 0.35, pause: 0.08, word: 'threat' }, // கொ
            { f: 392.00, d: 0.35, pause: 0.08, word: 'threat' }, // டி
            { f: 440.00, d: 0.50, pause: 0.15, word: 'threat' }, // யாரை

            { f: 523.25, d: 0.40, pause: 0.08, word: 'king' },   // வேந்
            { f: 440.00, d: 0.35, pause: 0.08, word: 'king' },   // தொ
            { f: 392.00, d: 0.70, pause: 0.35, word: 'king' },   // றுத்தல்

            { f: 329.63, d: 0.45, pause: 0.08, word: 'crop' },   // பைங்
            { f: 392.00, d: 0.55, pause: 0.12, word: 'crop' },   // கூழ்
            { f: 440.00, d: 0.35, pause: 0.08, word: 'crop' },   // க
            { f: 523.25, d: 0.35, pause: 0.08, word: 'crop' },   // ளை
            { f: 440.00, d: 0.35, pause: 0.08, word: 'crop' },   // கட்
            { f: 392.00, d: 0.35, pause: 0.12, word: 'crop' },   // டதனொடு

            { f: 293.66, d: 1.40, pause: 0.40, word: 'equal' }   // நேர்.
          ];

          let currentTime = sound.ctx.currentTime + 0.1;
          let currentDelay = 100;

          notes.forEach((n, idx) => {
            const osc = sound.ctx.createOscillator();
            const gain = sound.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.f, currentTime);
            gain.gain.setValueAtTime(0.24, currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, currentTime + n.d);
            osc.connect(gain);
            gain.connect(sound.ctx.destination);
            osc.start(currentTime);
            osc.stop(currentTime + n.d);

            // Synchronize visual karaoke highlight
            setTimeout(() => {
              if (btnChant.classList.contains('chanting')) {
                selectWord(n.word);
              }
            }, currentDelay);

            const stepDuration = (n.d + n.pause) * 1000;
            currentTime += n.d + n.pause;
            currentDelay += stepDuration;
          });

          setTimeout(() => {
            btnChant.classList.remove('chanting');
            kuralWords.forEach(w => w.classList.remove('highlighted'));
            breakCells.forEach(c => c.classList.remove('active'));
          }, currentDelay);
        } else {
          kuralWords.forEach(w => w.classList.remove('highlighted'));
          breakCells.forEach(c => c.classList.remove('active'));
        }
      });
    }

    // 2. Scholar Commentary Switcher
    scholarPills.forEach(pill => {
      pill.addEventListener('click', () => {
        scholarPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const key = pill.getAttribute('data-scholar');
        const data = COMMENTARIES[key] || COMMENTARIES.core;

        if (commEyebrow) commEyebrow.textContent = data.eyebrow;
        if (commBody) commBody.textContent = data.body;
        if (commHighlight) commHighlight.textContent = data.highlight;
        if (commDetail) commDetail.textContent = data.detail;
        sound.playChime(528, 1.2);
      });
    });

    // 3. Metaphor Lens Switcher + Dynamic Atmosphere Tint
    metaTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        metaTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const lens = tab.getAttribute('data-perspective');

        if (modalKural) {
          modalKural.classList.remove('theme-farmer', 'theme-ruler', 'theme-unified');
          modalKural.classList.add('theme-' + lens);
        }

        if (lens === 'farmer') {
          if (commEyebrow) commEyebrow.textContent = 'THE AGRARIAN LENS • உழவர் பார்வை';
          if (commBody) commBody.textContent = '“A farmer tenders the soil with immense love. But when a choking weed threatens the food of an entire village, he extracts it without hesitation. Uprooting is not malice; it is the protection of life.”';
          if (commHighlight) commHighlight.textContent = 'The crop represents society. The weed represents the parasite.';
          if (commDetail) commDetail.textContent = 'Sacrifice of the invasive weed ensures the survival of the nourished stalk.';
        } else if (lens === 'ruler') {
          if (commEyebrow) commEyebrow.textContent = 'THE SOVEREIGN LENS • அரசன் பார்வை';
          if (commBody) commBody.textContent = '“The ruler is not a tyrant seeking retribution. Like the farmer, the king carries the sacred obligation to safeguard the peaceful majority by neutralizing dangerous threats that violate the common good.”';
          if (commHighlight) commHighlight.textContent = 'Sovereign justice is the surgery of compassion for the whole.';
          if (commDetail) commDetail.textContent = 'A kingdom that refuses to remove predators will soon lose its innocent people.';
        } else {
          const core = COMMENTARIES.core;
          if (commEyebrow) commEyebrow.textContent = core.eyebrow;
          if (commBody) commBody.textContent = core.body;
          if (commHighlight) commHighlight.textContent = core.highlight;
          if (commDetail) commDetail.textContent = core.detail;
        }
        sound.playChime(440, 1.4);
      });
    });

    // 4. Interactive Word Clicks (Couplet Spans)
    kuralWords.forEach(word => {
      word.addEventListener('click', () => {
        const wordKey = word.getAttribute('data-word');
        selectWord(wordKey);
        sound.playChime(587, 1.3);
      });
    });

    // 5. Matrix Card Clicks
    breakCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const wordKey = cell.getAttribute('data-word');
        selectWord(wordKey);
        sound.playChime(659, 1.5);
      });
    });

    // 6. Universal Parallels Accordion Toggle
    if (btnToggleParallels && parallelsGrid) {
      btnToggleParallels.addEventListener('click', () => {
        const isClosed = parallelsGrid.classList.contains('hidden');
        if (isClosed) {
          parallelsGrid.classList.remove('hidden');
          btnToggleParallels.setAttribute('aria-expanded', 'true');
          sound.playChime(494, 1.2);
        } else {
          parallelsGrid.classList.add('hidden');
          btnToggleParallels.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // ==========================================================================
  // BOOTSTRAP EXPERIENCE
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    generateCrops();
    initParticles();
    window.addEventListener('resize', () => { initParticles(); initEmbers(); });

    applyHashNavigation();
    setupIntroScreen();
    setupClimaxActions();

    requestAnimationFrame(animate);

    if (!window.location.hash || window.location.hash === '#0' || window.location.hash === '#dawn') {
      setTimeout(() => {
        showWhisper('A traveler approached a kingdom...', 4500);
      }, 800);
    }
  });

})();
