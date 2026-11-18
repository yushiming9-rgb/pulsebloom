// The renderer: draws the world each frame — a beat-reactive backdrop, glowing entities,
// particles and the letterbox transform that maps the 1280x720 playfield onto the window.
// Menu and HUD surfaces live in screens.js; this file only renders what is in play.

import { FIELD, PALETTE } from './config.js';

function glowCircle(ctx, x, y, radius, colour, glow, core) {
  ctx.shadowColor = colour;
  ctx.shadowBlur = glow;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (core) {
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawBackdrop(ctx, s) {
  ctx.fillStyle = PALETTE.arena;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // The arena breathes on every beat: a ring swells from the centre.
  const beatPhase = (s.time / s.secondsPerBeat) % 1;
  ctx.strokeStyle = `rgba(99,230,255,${0.16 * s.beatFlash})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(FIELD.centreX, FIELD.centreY, 60 + beatPhase * 420, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  for (let x = 80; x < FIELD.width; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, FIELD.height);
    ctx.stroke();
  }
  for (let y = 80; y < FIELD.height; y += 160) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(FIELD.width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(99,230,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, FIELD.width - 12, FIELD.height - 12);
}

function drawPlayer(ctx, s) {
  const p = s.player;
  const blink = p.invuln > 0 && Math.floor(s.time * 20) % 2 === 0;
  if (blink) ctx.globalAlpha = 0.35;
  // Dash trail.
  if (p.dashTimer > 0) {
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(p.x - p.dashVX * 0.08, p.y - p.dashVY * 0.08);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  glowCircle(ctx, p.x, p.y, 15 + s.beatFlash * 2, PALETTE.player, 22, PALETTE.playerCore);
  // Aim whisker.
  ctx.strokeStyle = 'rgba(99,230,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + (p.aimX ?? 1) * 34, p.y + (p.aimY ?? 0) * 34);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawEnemies(ctx, s) {
  for (const enemy of s.enemies) {
    const wobble = 1 + enemy.pulse * 0.15;
    if (enemy.type === 'dart' && enemy.telegraph > 0) {
      ctx.strokeStyle = PALETTE.enemyB;
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(s.player.x, s.player.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (enemy.type === 'boss') {
      ctx.shadowColor = enemy.tint;
      ctx.shadowBlur = 30;
      ctx.fillStyle = enemy.tint;
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i <= points; i += 1) {
        const angle = (i / points) * Math.PI * 2 + s.time * 0.8;
        const radius = enemy.radius * (i % 2 === 0 ? wobble : wobble * 0.75);
        const x = enemy.x + Math.cos(angle) * radius;
        const y = enemy.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      glowCircle(ctx, enemy.x, enemy.y, enemy.radius * 0.4, PALETTE.playerCore, 18);
    } else {
      glowCircle(ctx, enemy.x, enemy.y, enemy.radius * wobble, enemy.tint, 16, 'rgba(255,255,255,0.65)');
      if (enemy.type === 'dart' && enemy.chargeDir) {
        ctx.strokeStyle = enemy.tint;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + enemy.chargeDir.x * 26, enemy.y + enemy.chargeDir.y * 26);
        ctx.stroke();
      }
    }
    // Health pips for tough foes.
    if (enemy.hp > 2) {
      ctx.fillStyle = PALETTE.text;
      for (let i = 0; i < Math.min(enemy.hp, 8); i += 1) {
        ctx.fillRect(enemy.x - 14 + i * 4, enemy.y - enemy.radius - 12, 2, 6);
      }
    }
  }
}

function drawBullets(ctx, s) {
  ctx.shadowColor = PALETTE.bullet;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.bullet;
  for (const bullet of s.bullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowColor = PALETTE.enemyBullet;
  ctx.fillStyle = PALETTE.enemyBullet;
  for (const bullet of s.enemyBullets) {
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawParticles(ctx, s) {
  for (const particle of s.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.colour;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

/** Draw one full frame of the world in the 1280x720 logical space. */
export function drawWorld(ctx, world, playerAim) {
  const s = world.state;
  s.player.aimX = playerAim.x - s.player.x;
  s.player.aimY = playerAim.y - s.player.y;
  drawBackdrop(ctx, s);
  drawParticles(ctx, s);
  drawEnemies(ctx, s);
  drawBullets(ctx, s);
  drawPlayer(ctx, s);
}

/** The letterbox transform for a real window size; returns what input.js needs to undo it. */
export function computeTransform(canvasWidth, canvasHeight) {
  const scale = Math.min(canvasWidth / FIELD.width, canvasHeight / FIELD.height);
  const offsetX = (canvasWidth - FIELD.width * scale) / 2;
  const offsetY = (canvasHeight - FIELD.height * scale) / 2;
  return { scale, offsetX, offsetY };
}
