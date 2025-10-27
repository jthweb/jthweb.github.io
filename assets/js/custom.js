'use strict';

// --- Config ---
const GITHUB_USERNAME = 'jthweb';
const PROXY_URL = 'https://github-oauth-proxy-server.vercel.app/api/auth';

// --- OAuth helpers ---
function redirectToProxy(action, repo = null) {
  let proxyUrl = `${PROXY_URL}?action=${encodeURIComponent(action)}`;
  if (repo) proxyUrl += `&repo=${encodeURIComponent(repo)}`;
  const authWindow = window.open(proxyUrl, 'githubAuth', 'width=600,height=700,scrollbars=yes');
  const checkWindow = setInterval(() => {
    if (!authWindow || authWindow.closed) {
      clearInterval(checkWindow);
      // If a dynamic list exists, refresh it
      if (document.getElementById('dynamic-projects')) {
        renderDynamicProjects('dynamic-projects', 9);
      }
      if (document.getElementById('projects-grid-full')) {
        renderDynamicProjects('projects-grid-full', null);
      }
    }
  }, 700);
}
function handleFollow() { redirectToProxy('follow'); }
function handleStar(repoFullName) { redirectToProxy('star', repoFullName); }
function handleFollowAndStarAll() { redirectToProxy('follow_and_star_all'); }

// Wire header/nav actions if present
(function wireHeaderActions() {
  const followBtn = document.getElementById('btn-follow');
  const starAllBtn = document.getElementById('btn-star-all');
  if (followBtn) followBtn.addEventListener('click', handleFollow);
  if (starAllBtn) starAllBtn.addEventListener('click', handleFollowAndStarAll);
})();

// --- GitHub rendering ---
async function fetchUserRepos(username) {
  const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
  const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  const repos = await res.json();
  // Filter out forks and unwanted repos
  return repos.filter(r => !r.fork && r.name.toLowerCase() !== 'new');
}

function repoCardHTML(repo) {
  const lang = repo.language ? `<span class="project-category" style="opacity:.9;">${repo.language}</span>` : '';
  return `
    <div class="project-item active" data-filter-item data-category="web development">
      <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">
        <figure class="project-img">
          <div class="project-item-icon-box">
            <ion-icon name="eye-outline"></ion-icon>
          </div>
          <img src="https://opengraph.githubassets.com/1/${repo.full_name}" alt="${repo.name}" loading="lazy">
        </figure>
        <h3 class="project-title">${repo.name}</h3>
        <p class="project-category">${repo.description ? repo.description : 'No description available.'}</p>
      </a>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;">
        <div style="display:flex;gap:12px;align-items:center;opacity:.9;">
          <span title="Stars"><i class="fas fa-star" style="color:#f1c40f;"></i> ${repo.stargazers_count}</span>
          <span title="Forks"><i class="fas fa-code-branch" style="color:var(--vegas-gold);"></i> ${repo.forks_count}</span>
          ${lang}
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn" data-star-repo="${repo.full_name}" title="Star repo">⭐</button>
          <a class="btn" href="${repo.html_url}" target="_blank" rel="noopener noreferrer">Open</a>
        </div>
      </div>
    </div>
  `;
}

async function renderDynamicProjects(containerId, limit = 9) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p class="project-category">Loading projects…</p>';
  try {
    const repos = await fetchUserRepos(GITHUB_USERNAME);
    const list = limit ? repos.slice(0, limit) : repos;
    container.innerHTML = list.map(repoCardHTML).join('');
    // Wire star buttons
    container.querySelectorAll('[data-star-repo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const full = btn.getAttribute('data-star-repo');
        handleStar(full);
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p class="project-category">Could not load projects (rate limited?). Try again later.</p>';
  }
}

// Auto-init for pages that have the containers
(function initPages() {
  if (document.getElementById('dynamic-projects')) {
    renderDynamicProjects('dynamic-projects', 9);
  }
  if (document.getElementById('projects-grid-full')) {
    renderDynamicProjects('projects-grid-full', null);
  }
  // Optional counters
  if (document.getElementById('total-stars') || document.getElementById('total-projects')) {
    fetchUserRepos(GITHUB_USERNAME).then(repos => {
      const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
      const totalProjects = repos.length;
      const starsEl = document.getElementById('total-stars');
      const projEl = document.getElementById('total-projects');
      if (starsEl) starsEl.textContent = `${totalStars} Stars`;
      if (projEl) projEl.textContent = `${totalProjects} Projects`;
    }).catch(() => {});
  }
})();

// --- SPA hash navigation for index page ---
(function spaHashNav() {
  const pages = document.querySelectorAll('[data-page]');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  if (!pages.length || !navLinks.length) return;

  function setActivePage(pageName) {
    let matchedIndex = -1;
    for (let i = 0; i < pages.length; i++) {
      const matches = pages[i].dataset.page === pageName;
      pages[i].classList.toggle('active', matches);
      if (matches) matchedIndex = i;
    }
    for (let i = 0; i < navLinks.length; i++) {
      const matches = navLinks[i].innerHTML.toLowerCase() === pageName;
      navLinks[i].classList.toggle('active', matches);
    }
    if (matchedIndex >= 0) window.scrollTo(0, 0);
  }

  function applyHash() {
    const hash = (location.hash || '').replace('#', '').toLowerCase();
    const valid = ['about', 'resume', 'portfolio', 'contact'];
    if (hash && valid.includes(hash)) setActivePage(hash);
  }

  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const name = link.innerHTML.toLowerCase();
      const valid = ['about', 'resume', 'portfolio', 'contact'];
      if (valid.includes(name)) {
        history.replaceState(null, '', `#${name}`);
      }
    });
  });

  window.addEventListener('hashchange', applyHash);
  applyHash();
})();

// --- Custom Cursor ---
(function customCursor() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return;
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });
})();

// --- 3D Background Animation (three.js) ---
(function bg3D() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  canvas.style.opacity = '1';

  const shapeGeometry = new THREE.IcosahedronGeometry(1.2, 0);
  const shapeMaterial = new THREE.MeshBasicMaterial({ color: 0xF6A700, wireframe: true, transparent: true, opacity: 0.35 });
  const shape = new THREE.Mesh(shapeGeometry, shapeMaterial);
  scene.add(shape);

  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 5000;
  const posArray = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 14;
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particlesMaterial = new THREE.PointsMaterial({ size: 0.006, color: 0xF6A700, transparent: true, opacity: 0.3 });
  const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particleMesh);

  camera.position.z = 3;
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    shape.rotation.x += 0.001;
    shape.rotation.y += 0.001;
    const scale = 1 + Math.sin(elapsedTime * 0.7) * 0.05;
    shape.scale.set(scale, scale, scale);
    particleMesh.rotation.y += 0.0002;
    if (mouseX > 0) {
      const targetX = (mouseX - window.innerWidth / 2) * 0.0005;
      const targetY = (mouseY - window.innerHeight / 2) * 0.0005;
      shape.rotation.y += (targetX - shape.rotation.y) * 0.05;
      shape.rotation.x += (targetY - shape.rotation.x) * 0.05;
      particleMesh.rotation.y += (targetX - particleMesh.rotation.y) * 0.01;
      particleMesh.rotation.x += (targetY - particleMesh.rotation.x) * 0.01;
    }
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
})();

