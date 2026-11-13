document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#main-nav');

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
}

menuButton.hidden = false;
menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  navigation.classList.toggle('is-open', !isOpen);
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
