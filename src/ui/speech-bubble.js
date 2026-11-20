export function destroySpeechBubble(entry) {
  if (!entry) return;
  clearInterval(entry.typeTimer);
  clearTimeout(entry.holdTimer);
  clearTimeout(entry.removeTimer);
  entry.el?.remove();
}

export function spawnTypewriterSpeechBubble({
  layer,
  text,
  x = 0,
  y = 0,
  holdMs = 5000,
  charDelayMs = 22,
  onRemove = null,
}) {
  if (!layer || !text) return null;

  const bubble = document.createElement('div');
  bubble.className = 'npc-speech-bubble pop-in';
  const textSpan = document.createElement('span');
  bubble.appendChild(textSpan);
  if (Number.isFinite(x) && Number.isFinite(y)) {
    bubble.style.left = `${x.toFixed(1)}px`;
    bubble.style.top = `${y.toFixed(1)}px`;
  }
  layer.appendChild(bubble);

  const chars = [...String(text)];
  const entry = {
    el: bubble,
    typeTimer: null,
    holdTimer: null,
    removeTimer: null,
  };

  let charIdx = 0;
  entry.typeTimer = setInterval(() => {
    if (!bubble.isConnected) {
      clearInterval(entry.typeTimer);
      entry.typeTimer = null;
      return;
    }
    charIdx += 1;
    textSpan.textContent = chars.slice(0, charIdx).join('');
    if (charIdx >= chars.length) {
      clearInterval(entry.typeTimer);
      entry.typeTimer = null;
      entry.holdTimer = setTimeout(() => {
        bubble.classList.remove('pop-in');
        bubble.classList.add('shrink-out');
        entry.removeTimer = setTimeout(() => {
          destroySpeechBubble(entry);
          onRemove?.(entry);
        }, 250);
      }, holdMs);
    }
  }, charDelayMs);

  return entry;
}
