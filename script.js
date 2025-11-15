'use strict';

const TOTAL_CATS = 10;
const cardStack = document.getElementById('cardStack');
const app = document.querySelector('.app');
const summaryScreen = document.getElementById('summaryScreen');
const likeCountEl = document.getElementById('likeCount');
const totalCountEl = document.getElementById('totalCount');
const likedCatsContainer = document.getElementById('likedCats');
const labelEl = document.querySelector('.progress-label');
const progressFill = document.querySelector('.progress-fill');

let cards = [];
let likedCats = [];

// Initialize
async function init() {
  progressFill.style.width = '0%';
  await loadCats();
  setupCards();
  setupButtons();
  app.classList.add('loaded');
}

// Load cat images asynchronously
async function loadCats() {
  const catPromises = [];
  for (let i = 0; i < TOTAL_CATS; i++) {
    catPromises.push(createUniqueCat(i));
  }
  const cats = await Promise.all(catPromises);
  cats.forEach(cat => {
    const card = createCard(cat);
    cardStack.appendChild(card);
    cards.push(card);
  });
}

// Create a unique cat object with image URL
function createUniqueCat(index) {
  return new Promise((resolve) => {
    const timestamp = Date.now() + index;
    const url = `https://cataas.com/cat?${timestamp}`;
    const img = new Image();
    img.onload = () => resolve({ id: index, url });
    img.onerror = () => resolve({ id: index, url: 'https://cataas.com/cat' }); // fallback
    img.src = url;
  });
}

// Create a card element for a cat
function createCard(cat) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.catId = cat.id;
  card.dataset.imageUrl = cat.url;
  card.innerHTML = `
    <img src="${cat.url}" alt="Cat ${cat.id + 1}">
    <h3>Kitty #${cat.id + 1}</h3>
  `;
  return card;
}

// Set up styles and event listeners for cards
function setupCards() {
  // Get active (non-removed) cards
  const activeCards = document.querySelectorAll('.card:not(.removed)');
  // Apply stacking styles
  activeCards.forEach((card, i) => {
    card.style.zIndex = TOTAL_CATS - i;
    card.style.transform = `scale(${(20 - i) / 20}) translateY(-${20 * i}px)`;
    card.style.opacity = (10 - i) / 10;
  });
  
  // Set up Hammer.js for each card
  activeCards.forEach(card => {
    // Avoid double-binding Hammer
    if (card.hammer) card.hammer.destroy();
    const hammer = new Hammer(card);
    card.hammer = hammer;
    setupHammer(hammer, card);
  });
}

// Set up Hammer.js pan events for a card
function setupHammer(hammer, card) {
  // Handle pan (drag) event
  hammer.on('pan', (e) => {
    if (e.deltaX === 0) return; // Ignore if no horizontal movement

    card.classList.add('moving');

    // Toggle like/dislike overlays based on direction
    app.classList.toggle('show-like', e.deltaX > 0);
    app.classList.toggle('show-dislike', e.deltaX < 0);

    // Apply transform based on drag
    const x = e.deltaX;
    const rotate = x * 0.05;
    card.style.transform = `translate(${x}px, ${e.deltaY}px) rotate(${rotate}deg)`;
  });

  // Handle pan end event
  hammer.on('panend', (e) => {
    card.classList.remove('moving');
    app.classList.remove('show-like', 'show-dislike');

    const threshold = 100; // Pixel threshold for swipe
    const velocityThreshold = 0.4; // Velocity threshold for swipe
    // Check if swipe was enough
    const movedEnough = Math.abs(e.deltaX) > threshold || Math.abs(e.velocityX) > velocityThreshold;

    if (!movedEnough) {
      card.style.transform = '';
      return;
    }

    // Determine direction and apply final transform
    const dir = e.deltaX > 0 ? 1 : -1;
    const endX = dir * window.innerWidth * 1.5;
    const endY = e.deltaY;
    const rotate = dir * 30;

    card.classList.add('removed');
    card.style.transform = `translate(${endX}px, ${endY}px) rotate(${rotate}deg)`;

    // Add to liked if swiped right
    if (dir > 0) {
      const imageUrl = card.dataset.imageUrl;
      if (!likedCats.includes(imageUrl)) {
        likedCats.push(imageUrl);
      }
    }

    updateProgress();
    checkCompletion();
    setTimeout(setupCards, 300);
  });
}

function setupButtons() {
  document.getElementById('dislikeBtn').onclick = () => swipeCard(false);
  document.getElementById('likeBtn').onclick = () => swipeCard(true);
}

// Programmatically swipes a card (via buttons)
function swipeCard(like) {
  const card = document.querySelector('.card:not(.removed)');
  if (!card) return;

  card.classList.add('removed');
  const dir = like ? 1 : -1;
  const moveX = dir * window.innerWidth * 1.5;
  card.style.transform = `translate(${moveX}px, -100px) rotate(${dir * 30}deg)`;
  
  if (like) {
    const imageUrl = card.dataset.imageUrl;
    if (!likedCats.includes(imageUrl)) {
      likedCats.push(imageUrl);
    }
  }

  updateProgress();
  checkCompletion();
  setTimeout(setupCards, 300);
}

// Update the progress label based on number of swiped cards
function updateLabel(swiped) {
  const labels = [
    "Let's go!",
    "Too adorable!",
    "Halfway there!",
    "So many cuties!",
    "Almost done!",
    "Last kitty!"
  ];
  labelEl.textContent = swiped === 0 ? "Let's go!" : swiped === TOTAL_CATS ? "All done!" :
  labels[Math.min(Math.floor(swiped * 6 / TOTAL_CATS), 5)];
}

// Update the progress bar and label
function updateProgress() {
  const remaining = document.querySelectorAll('.card:not(.removed)').length;
  const swiped = TOTAL_CATS - remaining;
  const percent = (swiped / TOTAL_CATS) * 100;
  progressFill.style.width = `${percent}%`;
  updateLabel(swiped);
}

function checkCompletion() {
  if (document.querySelectorAll('.card:not(.removed)').length === 0) {
    setTimeout(showSummary, 600);
  }
}

function showSummary() {
  app.style.display = 'none';
  summaryScreen.style.display = 'flex';

  likeCountEl.textContent = likedCats.length;
  totalCountEl.textContent = TOTAL_CATS;

  likedCatsContainer.innerHTML = '';

  if (likedCats.length !== 0) {
    likedCats.forEach(src => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = "Liked cat";
      img.loading = "lazy";
      likedCatsContainer.appendChild(img);
    });
  }
}

init();
