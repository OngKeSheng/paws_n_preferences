// Configuration
const CONFIG = {
    CAT_COUNT: 15, // Number of cats to show
    SWIPE_THRESHOLD: 100, 
    ROTATION_STRENGTH: 20,
    API_BASE_URL: 'https://cataas.com'
};

let cats = [];
let currentIndex = 0;
let likedCats = [];
let dislikedCats = [];
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let activeCard = null;

const mainView = document.getElementById('main-view');
const resultsView = document.getElementById('results-view');
const cardContainer = document.getElementById('card-container');
const btnLike = document.getElementById('btn-like');
const btnDislike = document.getElementById('btn-dislike');
const btnRestart = document.getElementById('btn-restart');
const likeIndicator = document.getElementById('like-indicator');
const dislikeIndicator = document.getElementById('dislike-indicator');
const progressFill = document.getElementById('progress-fill');
const currentCount = document.getElementById('current-count');
const totalCount = document.getElementById('total-count');

async function init() {
    try {
        // Fetch cat image from API
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/cats?limit=${CONFIG.CAT_COUNT}`);
        const data = await response.json();
        
        cats = data.map(cat => ({
            id: cat._id || cat.id,
            url: `${CONFIG.API_BASE_URL}/cat/${cat._id || cat.id}`,
            tags: cat.tags || []
        }));

        totalCount.textContent = cats.length;
        currentCount.textContent = currentIndex;
        renderCards();
        setupEventListeners();
    } catch (error) {
        console.error('Error loading cats:', error);
        cardContainer.innerHTML = '<div class="loading">😿 Failed to load cats. Please refresh the page.</div>';
    }
}

// Render cat cards
function renderCards() {
    cardContainer.innerHTML = '';
    
    const cardsToRender = cats.slice(currentIndex, currentIndex + 3);
    
    cardsToRender.forEach((cat, index) => {
        const card = createCard(cat, index);
        cardContainer.appendChild(card);
    });

    updateProgress();
}

// Create a single card element
function createCard(cat, stackIndex) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.catId = cat.id;
    card.dataset.catUrl = cat.url;
    
    const img = document.createElement('img');
    img.src = cat.url;
    img.alt = 'Adorable cat';
    img.loading = stackIndex === 0 ? 'eager' : 'lazy';
    
    img.onerror = () => {
        img.src = `${CONFIG.API_BASE_URL}/cat?${Math.random()}`; // Fallback to random cat
    };
    
    card.appendChild(img);
    
    if (stackIndex === 0) {
        setupCardDragListeners(card);
    }
    
    return card;
}

function setupCardDragListeners(card) {
    card.addEventListener('mousedown', onDragStart);
    card.addEventListener('touchstart', onDragStart, { passive: false });
}

// Drag/Swipe 
function onDragStart(e) {
    const touch = e.type === 'touchstart' ? e.touches[0] : e;
    startX = touch.clientX;
    startY = touch.clientY;
    isDragging = true;
    
    activeCard = e.currentTarget;
    if (activeCard) {
        activeCard.classList.add('dragging');
    }
    
    if (e.type === 'touchstart') {
        e.preventDefault();
    }
}

function onDragMove(e) {
    if (!isDragging || !activeCard) return;
    
    e.preventDefault();
    
    const touch = e.type === 'touchmove' ? e.touches[0] : e;
    currentX = touch.clientX - startX;
    currentY = touch.clientY - startY;
    
    // Apply rotation when swiping
    const rotation = (currentX / CONFIG.SWIPE_THRESHOLD) * CONFIG.ROTATION_STRENGTH;
    activeCard.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
    activeCard.style.transition = 'none';
    
    const opacity = Math.min(Math.abs(currentX) / CONFIG.SWIPE_THRESHOLD, 1);
    if (currentX > 0) {
        likeIndicator.style.opacity = opacity;
        likeIndicator.style.transform = `scale(${0.5 + opacity * 0.5}) rotate(20deg)`;
        dislikeIndicator.style.opacity = 0;
    } else {
        dislikeIndicator.style.opacity = opacity;
        dislikeIndicator.style.transform = `scale(${0.5 + opacity * 0.5}) rotate(-20deg)`;
        likeIndicator.style.opacity = 0;
    }
}

function onDragEnd(e) {
    if (!isDragging || !activeCard) return;
    
    isDragging = false;
    
    const card = activeCard;
    activeCard = null;
    
    card.classList.remove('dragging');
    
    if (Math.abs(currentX) > CONFIG.SWIPE_THRESHOLD) {
        // Swipe action
        if (currentX > 0) {
            swipeRight(card);
        } else {
            swipeLeft(card);
        }
    } else {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        likeIndicator.style.opacity = 0;
        likeIndicator.style.transform = 'scale(0.5) rotate(20deg)';
        dislikeIndicator.style.opacity = 0;
        dislikeIndicator.style.transform = 'scale(0.5) rotate(-20deg)';
    }
    
    currentX = 0;
    currentY = 0;
}

function swipeRight(card) {
    animateCardOut(card, 'right');
    likedCats.push({
        id: card.dataset.catId,
        url: card.dataset.catUrl
    });
    nextCard();
}

function swipeLeft(card) {
    animateCardOut(card, 'left');
    dislikedCats.push({
        id: card.dataset.catId,
        url: card.dataset.catUrl
    });
    nextCard();
}

// Animate card exit
function animateCardOut(card, direction) {
    const moveX = direction === 'right' ? 1000 : -1000;
    const rotation = direction === 'right' ? 30 : -30;
    
    card.style.transition = 'all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    card.style.transform = `translate(${moveX}px, ${currentY}px) rotate(${rotation}deg)`;
    card.style.opacity = '0';
    card.classList.add('removed');
    
    const indicator = direction === 'right' ? likeIndicator : dislikeIndicator;
    indicator.style.transition = 'all 0.3s ease';
    indicator.style.transform = `scale(1.2) rotate(${direction === 'right' ? 20 : -20}deg)`;
    

    setTimeout(() => {
        likeIndicator.style.opacity = 0;
        likeIndicator.style.transform = 'scale(0.5) rotate(20deg)';
        likeIndicator.style.transition = '';
        dislikeIndicator.style.opacity = 0;
        dislikeIndicator.style.transform = 'scale(0.5) rotate(-20deg)';
        dislikeIndicator.style.transition = '';
    }, 300);
}

function nextCard() {
    currentIndex++;
    updateProgress();
    currentCount.textContent = currentIndex;
    
    if (currentIndex >= cats.length) {
        setTimeout(() => showResults(), 600);
    } else {
        setTimeout(() => {
            const oldCard = cardContainer.querySelector('.card.removed');
            if (oldCard) {
                oldCard.remove();
            }
            
            // Add new card to the end if available
            if (currentIndex + 2 < cats.length) {
                const newCard = createCard(cats[currentIndex + 2], 2);
                cardContainer.appendChild(newCard);
            }
            
            // Make the new top card interactive
            const topCard = cardContainer.querySelector('.card:not(.removed)');
            if (topCard) {
                setupCardDragListeners(topCard);
            }
        }, 300);
    }
}

// Update progress bar
function updateProgress() {
    const progress = (currentIndex / cats.length) * 100;
    progressFill.style.width = `${progress}%`;
}


function handleLikeClick() {
    const card = cardContainer.querySelector('.card:not(.removed)');
    if (card) {
        likeIndicator.classList.add('active');
        setTimeout(() => likeIndicator.classList.remove('active'), 300);
        swipeRight(card);
    }
}

function handleDislikeClick() {
    const card = cardContainer.querySelector('.card:not(.removed)');
    if (card) {
        dislikeIndicator.classList.add('active');
        setTimeout(() => dislikeIndicator.classList.remove('active'), 300);
        swipeLeft(card);
    }
}

// Show results view
function showResults() {
    mainView.classList.add('hidden');
    resultsView.classList.remove('hidden');
    
    document.getElementById('liked-count').textContent = likedCats.length;
    document.getElementById('disliked-count').textContent = dislikedCats.length;
    
    // Display liked cats
    const likedCatsGrid = document.getElementById('liked-cats-grid');
    const noLikesMessage = document.getElementById('no-likes-message');
    
    likedCatsGrid.innerHTML = '';
    
    if (likedCats.length === 0) {
        noLikesMessage.classList.remove('hidden');
    } else {
        noLikesMessage.classList.add('hidden');
        
        likedCats.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'liked-cat-item';
            
            const img = document.createElement('img');
            img.src = cat.url;
            img.alt = 'Liked cat';
            img.loading = 'lazy';
            
            item.appendChild(img);
            likedCatsGrid.appendChild(item);
            
            // Add click to view full size
            item.addEventListener('click', () => {
                window.open(cat.url, '_blank');
            });
        });
    }
}

// Restart the app
function restart() {
    currentIndex = 0;
    likedCats = [];
    dislikedCats = [];
    
    resultsView.classList.add('hidden');
    mainView.classList.remove('hidden');
    
    currentCount.textContent = currentIndex;
    progressFill.style.width = '0%';
    
    renderCards();
}

// Button 
function setupEventListeners() {
    btnLike.addEventListener('click', handleLikeClick);
    btnDislike.addEventListener('click', handleDislikeClick);
    btnRestart.addEventListener('click', restart);
    
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    document.addEventListener('keydown', (e) => {
        if (mainView.classList.contains('hidden')) return;
        
        if (e.key === 'ArrowRight') {
            handleLikeClick();
        } else if (e.key === 'ArrowLeft') {
            handleDislikeClick();
        }
    });
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
