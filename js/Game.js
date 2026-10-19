import { Player } from './Player.js';
import { Input } from './input.js';
import { overlap, clamp } from './collision.js';

const W = 1000;
const H = 560;
const WORLD_WIDTH = 1900;
const BEST_KEY = 'frame01-best-time-v1';

export class Game {
  constructor(canvas, elements) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ui = elements;
    this.input = new Input();
    this.player = new Player(65, 450);
    this.solids = [
      {x: 0, y: 490, w: 850, h: 90, ground: true},
      {x: 1080, y: 490, w: 820, h: 90, ground: true},
      {x: 230, y: 410, w: 190, h: 17},
      {x: 440, y: 350, w: 190, h: 17},
      {x: 690, y: 390, w: 200, h: 17},
      {x: 960, y: 350, w: 190, h: 17},
      {x: 1240, y: 400, w: 200, h: 17}
    ];
    this.hazards = [{x: 622, y: 471, w: 74, h: 19}];
    this.exit = {x: 1770, y: 411, w: 55, h: 79};
    this.itemSeeds = [
      {x: 520, y: 315},
      {x: 780, y: 355},
      {x: 1330, y: 365}
    ];
    this.bestTime = this.readBest();
    this.state = 'ready';
    this.raf = null;
    this.lastFrame = null;
    this.elapsed = 0;
    this.cameraX = 0;
    this.resetLevel();
    this.bindUI();
    this.syncUI();
    this.render();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
    });
    window.addEventListener('blur', () => this.pause());
  }

  readBest() {
    try {
      const value = Number(localStorage.getItem(BEST_KEY));
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch { return null; }
  }
  saveBest() {
    if (this.bestTime === null || this.elapsed < this.bestTime) {
      this.bestTime = this.elapsed;
      try { localStorage.setItem(BEST_KEY, String(this.bestTime)); } catch { /* storage blocked */ }
    }
  }
  resetLevel() {
    this.player.reset();
    this.items = this.itemSeeds.map((item, index) => ({...item, index, collected: false}));
    this.score = 0;
    this.elapsed = 0;
    this.cameraX = 0;
    this.input.clear();
  }
  bindUI() {
    this.ui.start.addEventListener('click', () => this.state === 'paused' ? this.resume() : this.start());
    this.ui.pause.addEventListener('click', () => this.state === 'running' ? this.pause() : this.resume());
    this.ui.restart.addEventListener('click', () => this.restart());
    this.ui.overlayButton.addEventListener('click', () => this.state === 'paused' ? this.resume() : this.start());
  }
  start() {
    if (this.state === 'running') return;
    if (this.state === 'paused') { this.resume(); return; }
    this.resetLevel();
    this.state = 'running';
    this.input.active = true;
    this.lastFrame = null;
    this.syncUI();
    this.schedule();
  }
  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    this.input.active = false;
    this.input.clear();
    this.lastFrame = null;
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.syncUI();
    this.render();
  }
  resume() {
    if (this.state !== 'paused' || document.hidden) return;
    this.state = 'running';
    this.input.active = true;
    this.lastFrame = null;
    this.syncUI();
    this.schedule();
  }
  restart() {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.state = 'ready';
    this.input.active = false;
    this.resetLevel();
    this.lastFrame = null;
    this.syncUI();
    this.render();
  }
  finish(won) {
    this.state = won ? 'won' : 'lost';
    this.input.active = false;
    this.input.clear();
    if (won) this.saveBest();
    this.lastFrame = null;
    this.syncUI();
  }
  schedule() {
    if (this.raf !== null || this.state !== 'running') return;
    this.raf = requestAnimationFrame((timestamp) => this.frame(timestamp));
  }
  frame(timestamp) {
    this.raf = null;
    if (this.state !== 'running') return;
    const dt = this.lastFrame === null ? 0 : Math.min((timestamp - this.lastFrame) / 1000, 0.04);
    this.lastFrame = timestamp;
    this.update(dt);
    this.render();
    this.syncStats();
    if (this.state === 'running') this.schedule();
  }
  update(dt) {
    // Multiple short physics steps prevent tunnelling on slow devices.
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const step = dt / steps;
    for (let i = 0; i < steps && this.state === 'running'; i++) {
      this.player.update(step, this.input, this.solids);
      this.player.x = clamp(this.player.x, 0, WORLD_WIDTH - this.player.w);
      this.elapsed += step;
      for (const item of this.items) {
        if (item.collected) continue;
        const pickup = {x: item.x - 15, y: item.y - 15, w: 30, h: 30};
        if (overlap(this.player, pickup)) { item.collected = true; this.score++; }
      }
      if (this.player.y > H + 100 || this.hazards.some(h => overlap(this.player, h))) {
        this.finish(false);
      } else if (this.score === 3 && overlap(this.player, this.exit)) {
        this.finish(true);
      }
    }
    this.cameraX = clamp(this.player.x - W * 0.34, 0, WORLD_WIDTH - W);
  }
  syncStats() {
    this.ui.collected.textContent = `${String(this.score).padStart(2, '0')} / 03`;
    this.ui.time.textContent = this.formatTime(this.elapsed);
    this.ui.best.textContent = this.bestTime === null ? '—' : this.formatTime(this.bestTime);
    this.ui.hint.textContent = this.score < 3 ? `Найди фрагменты: осталось ${3 - this.score}` : 'Все фрагменты собраны! К порталу справа →';
  }
  formatTime(s) {
    const total = Math.floor(s);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  syncUI() {
    const {state, ui} = this;
    const labels = {ready:'READY TO PLAY', running:'EXPLORING', paused:'PAUSED', won:'ARCHIVE COMPLETE', lost:'ARCHIVE LOST'};
    ui.status.textContent = labels[state];
    ui.start.disabled = state === 'running';
    ui.start.innerHTML = state === 'paused' ? 'CONTINUE <span>▶</span>' : 'START <span>↗</span>';
    ui.pause.disabled = state !== 'running' && state !== 'paused';
    ui.pause.innerHTML = state === 'paused' ? 'CONTINUE <span>▶</span>' : 'PAUSE <span>Ⅱ</span>';
    ui.overlay.classList.toggle('hidden', state === 'running');
    const screens = {
      ready: ['NEW ARCHIVE / 001', 'READY TO<br>REASSEMBLE?', 'Собери три фрагмента. Избегай опасных зон и найди выход.', 'START EXPLORING ↗'],
      paused: ['ARCHIVE ON HOLD', 'PAUSED.', 'Можно продолжить с того же места.', 'CONTINUE ↗'],
      won: ['ALL PIECES FOUND', 'ARCHIVE<br>COMPLETE.', `Все три фрагмента собраны за ${this.formatTime(this.elapsed)}.`, 'PLAY AGAIN ↻'],
      lost: ['RESTART REQUIRED', 'TRY AGAIN.', 'Ты попал в опасную зону или упал. Попробуй другой маршрут.', 'RESTART ↻']
    };
    if (state !== 'running') {
      const [kicker, title, text, button] = screens[state];
      ui.overlayKicker.textContent = kicker;
      ui.overlayTitle.innerHTML = title;
      ui.overlayText.textContent = text;
      ui.overlayButton.textContent = button;
    }
    this.syncStats();
  }
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    // Paper-colored industrial archive with thin editorial grid.
    ctx.fillStyle = '#eae5dd'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ded8ce'; ctx.lineWidth = 1;
    for (let x = -(this.cameraX % 70); x < W; x += 70) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 50; y < H; y += 70) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.fillStyle = '#c9c2b8'; ctx.font = '12px monospace';
    ctx.fillText('FRAME / 01    •    FIND WHAT IS LOST', 28, 35);
    ctx.save(); ctx.translate(-Math.round(this.cameraX), 0);
    // Decorative archive labels.
    ctx.fillStyle = '#c8beb2'; ctx.font = 'bold 72px sans-serif';
    for (let x = 160; x < WORLD_WIDTH; x += 510) ctx.fillText('01 /', x, 190);
    for (const s of this.solids) {
      ctx.fillStyle = s.ground ? '#333331' : '#42423e';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = '#ae4045'; ctx.fillRect(s.x, s.y, s.w, 4);
      if (s.ground) {
        ctx.fillStyle = '#4b4b46';
        for (let x = s.x + 16; x < s.x + s.w; x += 34) ctx.fillRect(x, s.y + 26, 3, 22);
      }
    }
    // Pits and spikes.
    ctx.fillStyle = '#ae4045';
    for (const hazard of this.hazards) {
      for (let x = hazard.x; x < hazard.x + hazard.w; x += 14) {
        ctx.beginPath(); ctx.moveTo(x, hazard.y + hazard.h); ctx.lineTo(x + 7, hazard.y);
        ctx.lineTo(x + 14, hazard.y + hazard.h); ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = '#ae4045'; ctx.fillRect(850, 546, 230, 14);
    ctx.fillStyle = '#b5aaa0'; ctx.font = '11px monospace';
    ctx.fillText('DANGER / GAP', 900, 527);
    // Collectibles: rotating diamond fragments.
    for (const item of this.items) {
      if (item.collected) continue;
      const pulse = 1 + Math.sin(this.elapsed * 5 + item.index) * .1;
      ctx.save(); ctx.translate(item.x, item.y); ctx.rotate(Math.PI / 4); ctx.scale(pulse, pulse);
      ctx.fillStyle = '#ae4045'; ctx.fillRect(-10, -10, 20, 20);
      ctx.fillStyle = '#f4f1ea'; ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }
    // Exit appears closed until every fragment is found.
    ctx.strokeStyle = this.score === 3 ? '#ae4045' : '#77736b';
    ctx.lineWidth = 5; ctx.strokeRect(this.exit.x, this.exit.y, this.exit.w, this.exit.h);
    ctx.fillStyle = this.score === 3 ? 'rgba(174,64,69,.18)' : 'rgba(80,80,76,.12)';
    ctx.fillRect(this.exit.x + 5, this.exit.y + 5, this.exit.w - 10, this.exit.h - 10);
    ctx.fillStyle = '#333331'; ctx.font = '11px monospace';
    ctx.fillText(this.score === 3 ? 'EXIT / OPEN' : 'EXIT / LOCKED', this.exit.x - 10, this.exit.y - 12);
    this.player.render(ctx, this.elapsed);
    ctx.restore();
  }
}
