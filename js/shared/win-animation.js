// ============================================================
// Shared Win Celebration Animations
// ============================================================

const SYMBOLS = ['✦', '★', '♦', '●'];

function animCascade() {
  const colors = ['#ff4d6a', '#ffd447', '#5dade2', '#58d68d'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = SYMBOLS[i % 4];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-50px';
    el.style.fontSize = (Math.random() * 1.5 + 1.5) + 'rem';
    el.style.color = colors[i % 4];
    el.style.animationName = 'winCascade';
    el.style.animationDuration = (Math.random() * 3 + 4) + 's';
    el.style.animationDelay = (i * 0.05) + 's';
    document.body.appendChild(el);
  }
}

function animFireworks() {
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#fff'];
  for (let burst = 0; burst < 10; burst++) {
    const cx = 10 + Math.random() * 80;
    const cy = 10 + Math.random() * 60;
    for (let i = 0; i < 20; i++) {
      const el = document.createElement('div');
      el.className = 'win-particle';
      el.textContent = '✦';
      el.style.left = cx + 'vw';
      el.style.top = cy + 'vh';
      el.style.fontSize = (Math.random() * 1 + 1) + 'rem';
      el.style.color = colors[Math.floor(Math.random() * colors.length)];
      const angle = (i / 20) * 360;
      const dist = 15 + Math.random() * 25;
      el.style.setProperty('--dx', Math.cos(angle * Math.PI / 180) * dist + 'vw');
      el.style.setProperty('--dy', Math.sin(angle * Math.PI / 180) * dist + 'vh');
      el.style.animationName = 'winFirework';
      el.style.animationDuration = (Math.random() * 1.5 + 2) + 's';
      el.style.animationDelay = (burst * 0.3) + 's';
      document.body.appendChild(el);
    }
  }
}

function animConfetti() {
  const confettiChars = ['■', '●', '▲', '★', '♦'];
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#e67e22', '#9b59b6', '#ff69b4'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = confettiChars[Math.floor(Math.random() * confettiChars.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-30px';
    el.style.fontSize = (Math.random() * 0.8 + 0.8) + 'rem';
    el.style.color = colors[Math.floor(Math.random() * colors.length)];
    el.style.setProperty('--sway', (Math.random() * 40 - 20) + 'vw');
    el.style.animationName = 'winConfetti';
    el.style.animationDuration = (Math.random() * 4 + 5) + 's';
    el.style.animationDelay = (i * 0.05) + 's';
    document.body.appendChild(el);
  }
}

function animFountain() {
  const colors = ['#dc3545', '#f0c040', '#3498db', '#2ecc71'];
  for (let i = 0; i < 50; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = SYMBOLS[i % 4];
    el.style.left = (40 + Math.random() * 20) + 'vw';
    el.style.bottom = '-30px';
    el.style.top = 'auto';
    el.style.fontSize = (Math.random() * 1.2 + 1.2) + 'rem';
    el.style.color = colors[i % 4];
    el.style.setProperty('--spread', (Math.random() * 80 - 40) + 'vw');
    el.style.setProperty('--height', (60 + Math.random() * 30) + 'vh');
    el.style.animationName = 'winFountain';
    el.style.animationDuration = (Math.random() * 2 + 3.5) + 's';
    el.style.animationDelay = (i * 0.05) + 's';
    document.body.appendChild(el);
  }
}

function animSpiral() {
  const colors = ['#ef233c', '#f0c040', '#3498db', '#2ecc71', '#9b59b6', '#e67e22'];
  for (let i = 0; i < 36; i++) {
    const el = document.createElement('div');
    el.className = 'win-particle';
    el.textContent = SYMBOLS[i % 4];
    el.style.left = '50vw';
    el.style.top = '40vh';
    el.style.fontSize = (Math.random() * 1.2 + 1.2) + 'rem';
    el.style.color = colors[i % colors.length];
    const angle = (i / 36) * 720;
    const dist = 10 + (i / 36) * 40;
    el.style.setProperty('--sx', Math.cos(angle * Math.PI / 180) * dist + 'vw');
    el.style.setProperty('--sy', Math.sin(angle * Math.PI / 180) * dist + 'vh');
    el.style.animationName = 'winSpiral';
    el.style.animationDuration = '4.5s';
    document.body.appendChild(el);
  }
}

const WIN_ANIMATIONS = [animCascade, animFireworks, animConfetti, animFountain, animSpiral];

export function cascadeAnimation() {
  const anim = WIN_ANIMATIONS[Math.floor(Math.random() * WIN_ANIMATIONS.length)];
  anim();
  document.querySelectorAll('.win-particle').forEach(el => {
    el.addEventListener('animationend', () => el.remove(), { once: true });
  });
}

export function showWinOverlay($overlay) {
  $overlay.hidden = false;
  cascadeAnimation();
}

export function hideWinOverlay($overlay) {
  $overlay.hidden = true;
  document.querySelectorAll('.win-particle').forEach(el => el.remove());
}
