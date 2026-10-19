import { Game } from './Game.js';

const byId = id => document.getElementById(id);
const game = new Game(byId('game'), {
  start: byId('startBtn'),
  pause: byId('pauseBtn'),
  restart: byId('restartBtn'),
  overlay: byId('overlay'),
  overlayButton: byId('overlayBtn'),
  overlayKicker: byId('overlayKicker'),
  overlayTitle: byId('overlayTitle'),
  overlayText: byId('overlayText'),
  status: byId('statusLabel'),
  collected: byId('fragmentsLabel'),
  time: byId('timeLabel'),
  best: byId('bestLabel'),
  hint: byId('hintText')
});

// Useful while testing in the developer console.
window.frame01 = game;
