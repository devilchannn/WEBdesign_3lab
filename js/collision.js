// Pure geometry helpers. Positions are in world pixels.
export function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Resolve horizontal travel first, then vertical travel. Using previous
// bounds prevents landing on a platform from incorrectly passing through it.
export function moveWithCollisions(body, solids, dt) {
  const previousX = body.x;
  const stepX = body.vx * dt;
  body.x += stepX;
  for (const s of solids) {
    if (!overlap(body, s)) continue;
    if (stepX > 0 && previousX + body.w <= s.x + 1) {
      body.x = s.x - body.w;
      body.vx = 0;
    } else if (stepX < 0 && previousX >= s.x + s.w - 1) {
      body.x = s.x + s.w;
      body.vx = 0;
    }
  }

  const previousY = body.y;
  const stepY = body.vy * dt;
  body.y += stepY;
  body.grounded = false;
  for (const s of solids) {
    if (!overlap(body, s)) continue;
    if (stepY >= 0 && previousY + body.h <= s.y + 1) {
      body.y = s.y - body.h;
      body.vy = 0;
      body.grounded = true;
    } else if (stepY < 0 && previousY >= s.y + s.h - 1) {
      body.y = s.y + s.h;
      body.vy = 0;
    }
  }
}
