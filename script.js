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

document.querySelector('#year').textContent = new Date().getFullYear();
