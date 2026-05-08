// ── Elements ──
const eventCards = [...document.querySelectorAll('.event-card')];
const eventsScroll = document.querySelector('.events-scroll');
const timelineEl = document.querySelector('.event-timeline');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Wrap cards in an inner scroller so the timeline rail (absolutely positioned
// inside .events-scroll) doesn't scroll with content.
const scrollList = document.createElement('div');
scrollList.className = 'events-scroll-list';
const firstCard = eventCards[0];
firstCard.parentNode.insertBefore(scrollList, firstCard);
eventCards.forEach(card => scrollList.appendChild(card));

eventCards.forEach((card, index) => {
  card.dataset.index = String(index);
});

// ── Timeline (right rail) ──
const DAY_LABELS = { pre: 'Pre', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu' };
const timelineItems = [];
let currentIndex = 0;

function buildTimeline() {
  const totalsByDay = eventCards.reduce((acc, c) => {
    acc[c.dataset.day] = (acc[c.dataset.day] || 0) + 1;
    return acc;
  }, {});
  const seenByDay = {};

  eventCards.forEach((card, index) => {
    const day = card.dataset.day;
    seenByDay[day] = (seenByDay[day] || 0) + 1;
    const baseLabel = DAY_LABELS[day] || day;
    const label = totalsByDay[day] > 1 ? `${baseLabel} ${seenByDay[day]}` : baseLabel;

    const prev = eventCards[index - 1];
    const next = eventCards[index + 1];
    const startsDay = index !== 0 && (!prev || prev.dataset.day !== day);
    const hasNextInDay = next && next.dataset.day === day;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'timeline-item';
    if (startsDay) btn.classList.add('starts-day');
    if (hasNextInDay) btn.classList.add('has-next-in-day');
    btn.dataset.index = String(index);
    btn.innerHTML = `<span class="timeline-label">${label}</span><span class="timeline-dot" aria-hidden="true"></span>`;
    btn.addEventListener('click', () => scrollToCard(index));
    timelineEl.appendChild(btn);
    timelineItems.push(btn);
  });
}

function setActive(index) {
  if (index === currentIndex) return;
  currentIndex = index;
  const card = eventCards[index];
  const locationName = card.dataset.location || '';
  timelineItems.forEach((item, i) => item.classList.toggle('active', i === index));
  if (typeof highlightMarker === 'function') highlightMarker(locationName);
  if (typeof map !== 'undefined') map.closePopup();
}

// ── Scroll navigation ──
function scrollToCard(index) {
  if (index < 0 || index >= eventCards.length) return;
  eventCards[index].scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}

// Public API kept under the legacy name so map.js's marker.click still works.
function snapToCard(index) {
  scrollToCard(index);
}

// ── Scrollspy: which card is currently "active" based on scroll position ──
function setupScrollSpy() {
  // The card whose top crosses the upper third of the scroller becomes active.
  const observer = new IntersectionObserver(entries => {
    // Find the topmost intersecting card in the active band.
    let topmost = null;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!topmost || entry.boundingClientRect.top < topmost.boundingClientRect.top) {
        topmost = entry;
      }
    });
    if (topmost) {
      const index = eventCards.indexOf(topmost.target);
      if (index !== -1) setActive(index);
    }
  }, {
    root: scrollList,
    rootMargin: '-15% 0px -65% 0px',
    threshold: 0,
  });

  eventCards.forEach(card => observer.observe(card));
}

// ── Entrance animation: fades up the section as it scrolls into view ──
function setupEntranceAnimations() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('has-entered');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: scrollList,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.15,
  });

  eventCards.forEach(card => observer.observe(card));
}

// ── Keyboard navigation ──
function handleKeydown(event) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const direction = event.key === 'ArrowDown' ? 1 : -1;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= eventCards.length) return;
  event.preventDefault();
  scrollToCard(targetIndex);
}

// ── Init ──
buildTimeline();
setupScrollSpy();
setupEntranceAnimations();
window.addEventListener('keydown', handleKeydown);

// Mark the first card active immediately so the timeline + map are in sync on load.
timelineItems[0]?.classList.add('active');
eventCards[0]?.classList.add('has-entered');
