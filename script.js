document.documentElement.classList.add('js');

const themeButton = document.querySelector('.theme-toggle');
const themeLabel = themeButton.querySelector('.theme-label');
const themeColor = document.querySelector('meta[name="theme-color"]');

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = isDark ? 'Light' : 'Dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
  themeColor.content = isDark ? '#17191f' : '#faf9f6';
}

applyTheme(document.documentElement.dataset.theme || 'light');
themeButton.hidden = false;
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme);
  try { localStorage.setItem('theme', theme); } catch {
    // The toggle still works when the browser cannot save a preference.
  }
});

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton.hidden = false;
menuButton.addEventListener('click', event => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
  if (!isOpen && event.detail === 0) navigation.querySelector('a').focus();
});

navigation.addEventListener('click', event => {
  if (event.target.closest('a')) closeMenu();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});

const filterGroup = document.querySelector('.project-filters');
const projectCards = [...document.querySelectorAll('.project-card')];
const projectCount = document.querySelector('#project-count');

filterGroup.hidden = false;
filterGroup.addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;

  const filter = button.dataset.filter;
  let visibleCount = 0;
  projectCards.forEach(card => {
    const matches = filter === 'all' || card.dataset.category.split(' ').includes(filter);
    card.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  filterGroup.querySelectorAll('button').forEach(item => {
    item.setAttribute('aria-pressed', String(item === button));
  });
  projectCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} shown: ${button.textContent}.`;
});

// Section links remain ordinary anchors, including when JavaScript is disabled.
if ('IntersectionObserver' in window) {
  const sectionLinks = [...navigation.querySelectorAll('a[href^="#"]')];
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
}

const educationList = document.querySelector('#education-list');
const educationControls = document.querySelector('.education-controls');

if (educationList && educationControls) {
  // Sort by completion year so new qualifications appear first.
  const cards = [...educationList.children].sort((a, b) => Number(b.dataset.year) - Number(a.dataset.year));
  educationList.append(...cards);
  const newerButton = educationControls.querySelector('[data-direction="-1"]');
  const olderButton = educationControls.querySelector('[data-direction="1"]');

  function updateEducationControls() {
    const remaining = educationList.scrollWidth - educationList.clientWidth;
    educationControls.hidden = remaining <= 2;
    newerButton.disabled = educationList.scrollLeft <= 2;
    olderButton.disabled = educationList.scrollLeft >= remaining - 2;
  }

  educationControls.addEventListener('click', event => {
    const button = event.target.closest('button[data-direction]');
    if (!button) return;
    const cardWidth = educationList.firstElementChild.getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(educationList).columnGap);
    educationList.scrollBy({
      left: Number(button.dataset.direction) * (cardWidth + gap),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });
  educationList.addEventListener('scroll', updateEducationControls, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(updateEducationControls).observe(educationList);
  } else {
    window.addEventListener('resize', updateEducationControls);
  }
  updateEducationControls();
}

const abstractDialog = document.querySelector('#abstract-dialog');
const abstractTitle = document.querySelector('#abstract-title');
const abstractBody = abstractDialog.querySelector('.abstract-body');
const abstractStatus = document.querySelector('#abstract-status');
const abstractCopy = document.querySelector('#abstract-copy');
const abstractPaperLink = document.querySelector('#abstract-paper-link');
let abstractRequest;
let activeAbstract = 0;

function loadAbstracts() {
  if (!abstractRequest) {
    abstractRequest = fetch('assets/abstracts.json', { cache: 'no-cache' })
      .then(response => {
        if (!response.ok) throw new Error('Abstracts could not be loaded');
        return response.json();
      })
      .catch(error => {
        abstractRequest = null;
        throw error;
      });
  }
  return abstractRequest;
}

async function openAbstract(button) {
  const paperId = button.dataset.abstract;
  const titleLink = button.closest('.publication').querySelector('h3 a');
  const requestId = ++activeAbstract;
  abstractTitle.textContent = titleLink.textContent;
  abstractPaperLink.href = titleLink.href;
  abstractCopy.replaceChildren();
  abstractCopy.hidden = true;
  abstractStatus.hidden = false;
  abstractStatus.textContent = 'Loading abstract…';
  abstractBody.setAttribute('aria-busy', 'true');
  abstractBody.scrollTop = 0;
  document.body.classList.add('abstract-open');
  abstractDialog.showModal();
  try {
    const data = await loadAbstracts();
    if (!abstractDialog.open || activeAbstract !== requestId) return;
    const paper = data.papers[paperId];
    if (!paper || typeof paper.abstract !== 'string' || !paper.abstract.trim()) {
      throw new Error('Abstract missing');
    }
    for (const text of paper.abstract.split(/\n\s*\n/)) {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      abstractCopy.append(paragraph);
    }
    abstractCopy.hidden = false;
    abstractStatus.hidden = true;
  } catch {
    if (abstractDialog.open && activeAbstract === requestId) {
      abstractStatus.textContent = 'The abstract could not be loaded. You can still read it in the full paper below.';
    }
  } finally {
    if (activeAbstract === requestId) abstractBody.setAttribute('aria-busy', 'false');
  }
}

if (typeof abstractDialog.showModal === 'function') {
  document.querySelectorAll('.abstract-button').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => openAbstract(button));
  });
  abstractDialog.querySelector('.abstract-close').addEventListener('click', () => abstractDialog.close());
  abstractDialog.addEventListener('click', event => {
    const box = abstractDialog.getBoundingClientRect();
    const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    if (event.target === abstractDialog && outside) abstractDialog.close();
  });
  abstractDialog.addEventListener('close', () => {
    activeAbstract += 1;
    document.body.classList.remove('abstract-open');
  });
}

document.querySelector('#year').textContent = new Date().getFullYear();
