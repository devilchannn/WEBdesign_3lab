export class Input {
  constructor() {
    this.pressed = new Set();
    this.jumpQueued = false;
    this.active = false;
    this.touchPressed = new Set();
    this.isBound = false;
    this.bind();
  }

  get left() { return this.pressed.has('left') || this.touchPressed.has('left'); }
  get right() { return this.pressed.has('right') || this.touchPressed.has('right'); }
  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }
  clear() {
    this.pressed.clear();
    this.touchPressed.clear();
    this.jumpQueued = false;
    document.querySelectorAll('.touch-btn').forEach(btn => btn.classList.remove('pressed'));
  }
  bind() {
    if (this.isBound) return;
    this.isBound = true;
    const keyMap = {
      ArrowLeft: 'left', KeyA: 'left',
      ArrowRight: 'right', KeyD: 'right',
      ArrowUp: 'jump', KeyW: 'jump', Space: 'jump'
    };
    window.addEventListener('keydown', (e) => {
      const key = keyMap[e.code];
      if (!key || !this.active) return;
      const tag = e.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      e.preventDefault();
      if (key === 'jump') {
        if (!e.repeat && !this.pressed.has('jump')) this.jumpQueued = true;
      }
      this.pressed.add(key);
    });
    window.addEventListener('keyup', (e) => {
      const key = keyMap[e.code];
      if (key) this.pressed.delete(key);
    });
    window.addEventListener('blur', () => this.clear());
    const touchMap = { leftBtn: 'left', rightBtn: 'right', jumpBtn: 'jump' };
    for (const [id, key] of Object.entries(touchMap)) {
      const button = document.getElementById(id);
      if (!button) continue;
      button.addEventListener('pointerdown', (e) => {
        if (!this.active) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        button.classList.add('pressed');
        if (key === 'jump' && !this.touchPressed.has('jump')) this.jumpQueued = true;
        this.touchPressed.add(key);
      });
      const release = () => { this.touchPressed.delete(key); button.classList.remove('pressed'); };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    }
  }
}
