import { moveWithCollisions } from './collision.js';

export class Player {
  constructor(x = 65, y = 450) {
    this.spawnX = x;
    this.spawnY = y;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.w = 29;
    this.h = 40;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true; // spawn is directly on the ground
    this.facing = 1;
  }

  update(dt, input, solids) {
    const direction = Number(input.right) - Number(input.left);
    const targetSpeed = direction * 285;
    // Responsive acceleration, but consistent physical units (px/s).
    const acceleration = Math.min(1, 18 * dt);
    this.vx += (targetSpeed - this.vx) * acceleration;
    if (direction) this.facing = direction;

    // Consume only a newly pressed jump, never a held key.
    if (input.consumeJump() && this.grounded) {
      this.vy = -570;
      this.grounded = false;
    }
    this.vy = Math.min(this.vy + 1350 * dt, 1000);
    moveWithCollisions(this, solids, dt);
  }

  render(ctx, time) {
    const {x, y, w, h} = this;
    ctx.save();
    ctx.translate(x, y);
    // Framed silhouette with a tiny geometric face.
    ctx.fillStyle = '#22211f';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(5, 7, 19, 18);
    ctx.fillStyle = '#ae4045';
    ctx.fillRect(this.facing > 0 ? 16 : 9, 13, 5, 5);
    ctx.fillStyle = '#ae4045';
    const legSwing = this.grounded && Math.abs(this.vx) > 25 ? Math.sin(time * 15) * 3 : 0;
    ctx.fillRect(4, h - 2, 7, 5 + Math.max(0, legSwing));
    ctx.fillRect(18, h - 2, 7, 5 + Math.max(0, -legSwing));
    ctx.restore();
  }
}
