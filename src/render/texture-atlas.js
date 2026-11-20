function drawGrain(ctx, x, y, size, baseColor, count, alphaLight, alphaDark) {
  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y, size, size);
  for (let i = 0; i < count; i++) {
    const px = x + ((i * 97 + 13) % size);
    const py = y + ((i * 151 + 29) % size);
    const s = (i % 3 === 0) ? 2 : 1;
    ctx.fillStyle = i % 2 === 0
      ? `rgba(255,255,255,${alphaLight})`
      : `rgba(0,0,0,${alphaDark})`;
    ctx.fillRect(px, py, s, s);
  }
}

export function createTextureAtlas() {
  const size = 1024;
  const tile = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const uvs = {};
  const register = (name, col, row, drawFn) => {
    const x = col * tile;
    const y = row * tile;
    drawFn(ctx, x, y, tile);
    const pad = 1.5 / size;
    uvs[name] = {
      u0: x / size + pad,
      v0: y / size + pad,
      u1: (x + tile) / size - pad,
      v1: (y + tile) / size - pad
    };
  };

  register('solid', 0, 0, (c, x, y, s) => {
    c.fillStyle = '#ffffff';
    c.fillRect(x, y, s, s);
  });

  register('asphalt', 1, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#2b2f38', 650, 0.05, 0.14);
    c.strokeStyle = 'rgba(0,0,0,0.18)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(x + 18, y + 36);
    c.lineTo(x + 54, y + 48);
    c.lineTo(x + 76, y + 42);
    c.moveTo(x + 82, y + 92);
    c.lineTo(x + 114, y + 104);
    c.stroke();
  });

  register('sidewalk', 2, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#9aa1ad', 420, 0.08, 0.08);
    c.strokeStyle = 'rgba(40,46,58,0.28)';
    c.lineWidth = 2;
    for (let i = 0; i <= s; i += 32) {
      c.beginPath();
      c.moveTo(x + i, y);
      c.lineTo(x + i, y + s);
      c.stroke();
      c.beginPath();
      c.moveTo(x, y + i);
      c.lineTo(x + s, y + i);
      c.stroke();
    }
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 2;
    c.strokeRect(x + 2, y + 2, s - 4, s - 4);
  });

  register('grass', 3, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#367544', 520, 0.08, 0.12);
    for (let i = 0; i < 40; i++) {
      const gx = x + ((i * 53 + 7) % (s - 8));
      const gy = y + ((i * 89 + 11) % (s - 8));
      c.fillStyle = i % 3 === 0 ? '#4d945b' : '#2a5e36';
      c.fillRect(gx, gy, 4, 3);
    }
    c.fillStyle = '#fde68a';
    c.fillRect(x + 24, y + 38, 3, 3);
    c.fillRect(x + 92, y + 84, 3, 3);
  });

  register('water', 4, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#2186b5', 260, 0.09, 0.07);
    c.strokeStyle = 'rgba(186, 230, 253, 0.45)';
    c.lineWidth = 2;
    for (let wy = 18; wy < s; wy += 26) {
      c.beginPath();
      c.moveTo(x + 12, y + wy);
      c.quadraticCurveTo(x + s * 0.5, y + wy - 6, x + s - 12, y + wy);
      c.stroke();
    }
  });

  register('roof', 5, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#d1d5db', 360, 0.07, 0.08);
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = 2;
    for (let gy = 16; gy < s; gy += 16) {
      c.beginPath();
      c.moveTo(x, y + gy);
      c.lineTo(x + s, y + gy);
      c.stroke();
    }
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 4;
    c.strokeRect(x + 2, y + 2, s - 4, s - 4);
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(x + 18, y + 18, 28, 20);
  });

  register('floor', 6, 0, (c, x, y, s) => {
    drawGrain(c, x, y, s, '#dfd3be', 280, 0.06, 0.06);
    c.strokeStyle = 'rgba(100,78,52,0.22)';
    c.lineWidth = 2;
    for (let i = 0; i <= s; i += 32) {
      c.beginPath();
      c.moveTo(x, y + i);
      c.lineTo(x + s, y + i);
      c.stroke();
      c.beginPath();
      c.moveTo(x + i, y);
      c.lineTo(x + i, y + s);
      c.stroke();
    }
  });

  register('doormat', 7, 0, (c, x, y, s) => {
    c.fillStyle = 'rgba(26, 30, 38, 0.88)';
    c.fillRect(x + 6, y + 12, s - 12, s - 24);
    c.fillStyle = 'rgba(198, 174, 132, 0.92)';
    c.fillRect(x + 14, y + 22, s - 28, s - 44);
    c.strokeStyle = 'rgba(68, 56, 38, 0.65)';
    c.lineWidth = 4;
    c.strokeRect(x + 20, y + 28, s - 40, s - 56);
  });

  register('car', 0, 1, (c, x, y, s) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x + 10, y + 20, s - 16, s - 34);
    c.fillStyle = '#111827';
    c.fillRect(x + 18, y + 12, 20, 10);
    c.fillRect(x + s - 38, y + 12, 20, 10);
    c.fillRect(x + 18, y + s - 22, 20, 10);
    c.fillRect(x + s - 38, y + s - 22, 20, 10);

    c.fillStyle = '#ffffff';
    c.fillRect(x + 10, y + 18, s - 20, s - 36);
    c.fillStyle = '#1e293b';
    c.fillRect(x + 34, y + 26, s - 64, s - 52);
    c.fillStyle = 'rgba(255,255,255,0.22)';
    c.fillRect(x + 42, y + 30, s - 82, s - 60);
    c.fillStyle = '#fef08a';
    c.fillRect(x + s - 14, y + 24, 6, 14);
    c.fillRect(x + s - 14, y + s - 38, 6, 14);
    c.fillStyle = '#ef4444';
    c.fillRect(x + 8, y + 24, 5, 14);
    c.fillRect(x + 8, y + s - 38, 5, 14);
  });

  register('moto', 1, 1, (c, x, y, s) => {
    c.fillStyle = '#111827';
    c.fillRect(x + 12, y + 48, 28, 32);
    c.fillRect(x + s - 40, y + 48, 28, 32);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 30, y + 38, s - 60, s - 76);
    c.fillStyle = '#1f2937';
    c.fillRect(x + 44, y + 44, 30, s - 88);
    c.fillStyle = '#fef08a';
    c.fillRect(x + s - 16, y + 54, 6, 20);
  });

  register('van', 2, 1, (c, x, y, s) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(x + 8, y + 14, s - 12, s - 22);
    c.fillStyle = '#ffffff';
    c.fillRect(x + 8, y + 12, s - 16, s - 24);
    c.fillStyle = '#1e293b';
    c.fillRect(x + s - 38, y + 22, 20, s - 44);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(x + 16, y + 22, s - 62, s - 44);
    c.fillStyle = '#fef08a';
    c.fillRect(x + s - 12, y + 18, 5, 16);
    c.fillRect(x + s - 12, y + s - 34, 5, 16);
    c.fillStyle = '#ef4444';
    c.fillRect(x + 7, y + 18, 4, 16);
    c.fillRect(x + 7, y + s - 34, 4, 16);
  });

  register('player', 3, 1, (c, x, y, s) => {
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.beginPath();
    c.arc(x + s / 2 + 4, y + s / 2 + 4, 42, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1f2937';
    c.beginPath();
    c.arc(x + s / 2, y + s / 2, 40, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f59e0b';
    c.beginPath();
    c.arc(x + s / 2 + 8, y + s / 2, 26, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fde68a';
    c.beginPath();
    c.arc(x + s / 2 + 22, y + s / 2, 13, 0, Math.PI * 2);
    c.fill();
  });

  register('circle', 4, 1, (c, x, y, s) => {
    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = s * 0.48;
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.72)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  });

  register('shockwave', 5, 1, (c, x, y, s) => {
    const cx = x + s / 2;
    const cy = y + s / 2;
    const r = s * 0.49;
    const grad = c.createRadialGradient(cx, cy, r * 0.52, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.14)');
    grad.addColorStop(0.72, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.84, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.95, 'rgba(255, 255, 255, 0.3)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
  });

  register('trashbin', 6, 1, (c, x, y, s) => {
    c.fillStyle = 'rgba(0,0,0,0.34)';
    c.fillRect(x + 22, y + 24, s - 36, s - 36);
    c.fillStyle = '#334155';
    c.fillRect(x + 18, y + 18, s - 36, s - 36);
    c.strokeStyle = '#64748b';
    c.lineWidth = 6;
    c.strokeRect(x + 20, y + 20, s - 40, s - 40);
    c.fillStyle = '#15803d';
    c.fillRect(x + 28, y + 28, s - 56, s - 56);
    c.fillStyle = '#0f172a';
    c.fillRect(x + 42, y + 54, s - 84, 20);
  });

  register('disc', 7, 1, (c, x, y, s) => {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(x + s / 2, y + s / 2, s * 0.45, 0, Math.PI * 2);
    c.fill();
  });

  register('boat', 0, 2, (c, x, y, s) => {
    // Sombra na água
    c.fillStyle = 'rgba(0, 12, 24, 0.28)';
    c.beginPath();
    c.moveTo(x + s - 8, y + s * 0.5 + 3);
    c.quadraticCurveTo(x + s * 0.65, y + 20, x + 16, y + 24);
    c.lineTo(x + 16, y + s - 18);
    c.quadraticCurveTo(x + s * 0.65, y + s - 14, x + s - 8, y + s * 0.5 + 3);
    c.closePath();
    c.fill();

    // Casco principal (branco para receber tint de cor)
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x + s - 10, y + s * 0.5);
    c.quadraticCurveTo(x + s * 0.64, y + 18, x + 16, y + 22);
    c.lineTo(x + 16, y + s - 22);
    c.quadraticCurveTo(x + s * 0.64, y + s - 18, x + s - 10, y + s * 0.5);
    c.closePath();
    c.fill();

    // Convés interno
    c.fillStyle = '#e2e8f0';
    c.beginPath();
    c.moveTo(x + s - 24, y + s * 0.5);
    c.quadraticCurveTo(x + s * 0.6, y + 28, x + 26, y + 32);
    c.lineTo(x + 26, y + s - 32);
    c.quadraticCurveTo(x + s * 0.6, y + s - 28, x + s - 24, y + s * 0.5);
    c.closePath();
    c.fill();

    // Para-brisa e cabine
    c.fillStyle = '#1e293b';
    c.fillRect(x + 56, y + 36, 20, s - 72);
    c.fillStyle = 'rgba(255, 255, 255, 0.28)';
    c.fillRect(x + 62, y + 40, 8, s - 80);

    // Motor de popa
    c.fillStyle = '#0f172a';
    c.fillRect(x + 8, y + s * 0.5 - 10, 12, 20);
  });

  return { canvas, uvs };
}
