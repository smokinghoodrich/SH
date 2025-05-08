document.addEventListener('DOMContentLoaded', () => {
    // Initialize Telegram WebApp if available
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
    }

    // DOM Elements
    const elements = {
        unlockPhase: document.getElementById('unlock-phase'),
        scrollPhase: document.getElementById('scroll-phase'),
        resultPhase: document.getElementById('result-phase'),
        progressBar: document.getElementById('progress-bar'),
        multiTrackContainer: document.getElementById('multi-track-container'),
        multiResultContainer: document.getElementById('multi-result-container'),
        continueBtn: document.getElementById('continue-btn'),
        balanceEl: document.getElementById('balance'),
        profileBalance: document.getElementById('profile-balance'),
        freeCaseTimer: document.getElementById('free-case-timer'),
        caseImage: document.querySelector('.case-image'),
        themeToggle: document.getElementById('theme-toggle'),
        inventoryModal: document.getElementById('inventory-modal'),
        inventoryItems: document.getElementById('inventory-items'),
        closeInventory: document.getElementById('close-inventory'),
        totalOpened: document.getElementById('total-opened'),
        openOptions: document.querySelectorAll('.open-option'),
        openBtn: document.getElementById('open-btn'),
        profileBtn: document.getElementById('profile-btn')
    };

    // Item data - these would typically come from a backend
    const items = [
        { name: "🍉 Арбуз", image: "images/items/watermelon.png", flavor: "Сочный летний вкус", strength: "2/5", probability: 1 },
        { name: "🔋 Энергетик", image: "images/items/energy.png", flavor: "Заряд бодрости", strength: "4/5", probability: 1 },
        { name: "🍑 Персик", image: "images/items/peach.png", flavor: "Нежная сладость", strength: "1/5", probability: 1 },
        { name: "🍏 Яблоко", image: "images/items/apple.png", flavor: "Классическая свежесть", strength: "2/5", probability: 1 },
        { name: "🍓 Клубника", image: "images/items/strawberry.png", flavor: "Ягодный взрыв", strength: "3/5", probability: 1 },
        { name: "🎈 Бабл-Гам", image: "images/items/bubblegum.png", flavor: "Детская радость", strength: "1/5", probability: 1 },
        { name: "🫐 Ежевика", image: "images/items/blackberry.png", flavor: "Терпкая глубина", strength: "3/5", probability: 1 },
        { name: "🍇 Виноград", image: "images/items/grape.png", flavor: "Виноградный коктейль", strength: "2/5", probability: 1 },
        { name: "🥶 Холодок", image: "images/items/ice.png", flavor: "Ледяная свежесть", strength: "5/5", probability: 1 },
        { name: "🍒 Вишня", image: "images/items/cherry.png", flavor: "Терпкая сладость", strength: "4/5", probability: 1 },
        { name: "🫐 Черника", image: "images/items/blueberry.png", flavor: "Лесная ягода", strength: "3/5", probability: 1 },

        { name: "5% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-5", probability: 8 },
        { name: "10% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-10", probability: 5 },
        { name: "15% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-15", probability: 3 },
        { name: "20% Скидка", image: "images/items/discount.png", flavor: "На ваш следующий заказ", rarity: "discount-20", probability: 1 },

        { name: "Ничего", image: "images/items/nothing.png", flavor: "Попробуйте еще раз!", rarity: "nothing", probability: 60 },
        { name: "Бесплатная доставка", image: "images/items/shipping.png", flavor: "При заказе от 10 пачек", rarity: "free-shipping", probability: 3 },
        { name: "Дополнительный прокрут", image: "images/items/extra-spin.png", flavor: "Откройте еще один кейс бесплатно", rarity: "extra-spin", probability: 9 }
    ];

    // Configuration
    const config = {
        itemWidth: window.innerWidth <= 768 ? 140 : 180, // Адаптивная ширина
        itemsCount: 150,
        spinDuration: 8000,
        spinEasing: 'cubic-bezier(0.12, 0.65, 0.40, 0.99)',
        slowdownDuration: 2000,
        freeCaseInterval: 86400,
        trackAnimationDelayIncrement: 250
    };

    // Application state
    const state = {
        balance: localStorage.getItem('balance') ? parseInt(localStorage.getItem('balance')) : 100,
        isOpening: false,
        inventory: JSON.parse(localStorage.getItem('inventory')) || [],
        stats: JSON.parse(localStorage.getItem('stats')) || { totalOpened: 0 },
        freeCaseTimeLeft: localStorage.getItem('freeCaseTimeLeft') ? parseInt(localStorage.getItem('freeCaseTimeLeft')) : config.freeCaseInterval,
        selectedCount: 1,
        lastCaseTime: localStorage.getItem('lastCaseTime') ? parseInt(localStorage.getItem('lastCaseTime')) : null,
        wonItems: [],
        tracks: []
    };

    // Initialize the application
    function init() {
        checkFreeCase();
        setupEventListeners();
        startFreeCaseTimer();
        updateUI();
        applyTheme(localStorage.getItem('theme') || 'dark');
        document.querySelector('.open-option[data-count="1"]').classList.add('active');
    }

    // Set up event listeners
    function setupEventListeners() {
        elements.openBtn.addEventListener('click', startOpening);
        elements.continueBtn.addEventListener('click', continueAfterWin);
        elements.themeToggle.addEventListener('click', toggleTheme);
        elements.profileBtn.addEventListener('click', showInventory);
        elements.closeInventory.addEventListener('click', hideInventory);
        
        elements.openOptions.forEach(option => {
            option.addEventListener('click', () => {
                state.selectedCount = parseInt(option.dataset.count);
                elements.openOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                updateOpenButtonText();
            });
        });
    }

    // Start the case opening process
    function startOpening() {
        if (state.isOpening || state.balance < state.selectedCount) return;
        
        state.isOpening = true;
        state.balance -= state.selectedCount;
        state.wonItems = [];
        state.tracks = [];
        
        updateUI();
        playSound('unlock');
        
        // Reset and animate the progress bar
        elements.progressBar.style.width = '0%';
        const progressInterval = setInterval(() => {
            const width = parseFloat(elements.progressBar.style.width) || 0;
            if (width >= 100) {
                clearInterval(progressInterval);
                animateOpening();
            } else {
                elements.progressBar.style.width = (width + 1) + '%';
            }
        }, 20);
    }

    // Animate the case opening transition
    function animateOpening() {
        elements.caseImage.style.transform = 'rotateY(180deg) scale(1.2)';
        setTimeout(() => {
            elements.caseImage.style.transform = 'rotateY(0deg) scale(1)';
            startScrolling();
        }, 1000);
    }

    // Start the scrolling phase
    function startScrolling() {
        elements.unlockPhase.style.opacity = '0';
        elements.scrollPhase.style.display = 'flex';
        elements.multiTrackContainer.innerHTML = '';
        
        // Create tracks for each case being opened
        for (let i = 0; i < state.selectedCount; i++) {
            createTrack(i);
        }
        
        playSound('scroll');
        
        // Start the animations after a short delay
        setTimeout(() => {
            animateAllTracks();
        }, 100);
    }

    // Create a single track for a case
    function createTrack(index) {
        const trackContainer = document.createElement('div');
        trackContainer.className = 'track-container';
        
        const centerLine = document.createElement('div');
        centerLine.className = 'track-center-line';
        trackContainer.appendChild(centerLine);
        
        const itemsTrack = document.createElement('div');
        itemsTrack.className = 'items-track';
        trackContainer.appendChild(itemsTrack);
        
        elements.multiTrackContainer.appendChild(trackContainer);
        
        // Принудительно задаем ширину элементам для мобильных устройств
        const itemWidth = window.innerWidth <= 768 ? 140 : config.itemWidth;
        itemsTrack.style.width = `${config.itemsCount * itemWidth}px`;
        
        const track = {
            container: trackContainer,
            itemsTrack: itemsTrack,
            items: fillTrackWithItems(itemsTrack),
            selectedItem: null
        };
        
        state.tracks.push(track);
        
        // Центрируем трек с учетом ширины устройства
        const containerWidth = trackContainer.offsetWidth;
        const offset = (containerWidth - itemWidth) / 2;
        itemsTrack.style.left = `${offset}px`;
        
        return track;
    }
    // Fill a track with random items
    function fillTrackWithItems(track) {
        const items = generateItems();
        items.forEach(item => {
            const itemEl = createItemElement(item);
            track.appendChild(itemEl);
        });
        return Array.from(track.children);
    }

    // Generate an array of random items based on probability
    function generateItems() {
        // Create a weighted pool based on probability
        const weightedItems = [];
        items.forEach(item => {
            for (let i = 0; i < item.probability; i++) {
                weightedItems.push(item);
            }
        });
        
        // Generate the random items
        const result = [];
        for (let i = 0; i < config.itemsCount; i++) {
            const randomIndex = Math.floor(Math.random() * weightedItems.length);
            result.push(weightedItems[randomIndex]);
        }
        return result;
    }

    // Create an HTML element for an item
    function createItemElement(item) {
        const itemEl = document.createElement('div');
        itemEl.className = 'scroll-item';
        itemEl.innerHTML = `
            <img src="${item.image}" alt="${item.name}">
            <h3>${item.name}</h3>
        `;
        itemEl.dataset.item = JSON.stringify(item);
        return itemEl;
    }

    // Animate all tracks with staggered timing
    function animateAllTracks() {
        state.tracks.forEach((track, index) => {
            const itemWidth = config.itemWidth;
            const items = track.items;
            
            // Calculate the winning item position
            const winningIndex = Math.floor(Math.random() * (items.length - 50)) + 40;
            const winningOffset = winningIndex * itemWidth;
            
            // Add subtle randomness for natural effect
            const randomOffset = Math.random() * itemWidth * 0.3;
            const finalOffset = winningOffset + randomOffset;
            
            // Add staggered delay for multi-case opening
            const delay = index * config.trackAnimationDelayIncrement;
            
            // Start the animation after the delay
            setTimeout(() => {
                // Set up the smooth animation
                track.itemsTrack.style.transition = `transform ${config.spinDuration}ms ${config.spinEasing}`;
                track.itemsTrack.style.transform = `translateX(-${finalOffset}px)`;
                
                // Handle the end of animation
                const handleTransitionEnd = () => {
                    track.itemsTrack.removeEventListener('transitionend', handleTransitionEnd);
                    
                    // Add the selected class to the winning item
                    const selectedItem = items[winningIndex];
                    selectedItem.classList.add('selected');
                    
                    // Store the selected item
                    state.wonItems[index] = JSON.parse(selectedItem.dataset.item);
                    
                    // If all tracks are done, show the results
                    if (index === state.tracks.length - 1) {
                        setTimeout(finishOpening, 800);
                    }
                };
                
                track.itemsTrack.addEventListener('transitionend', handleTransitionEnd);
            }, delay);
        });
        
        // Play the slowdown sound after a delay
        setTimeout(() => {
            playSound('slowdown');
        }, config.spinDuration - config.slowdownDuration);
    }

    // Finish the opening process and show results
    function finishOpening() {
        elements.scrollPhase.style.display = 'none';
        showResults();
        
        // Update stats and handle prizes
        state.stats.totalOpened += state.selectedCount;
        state.lastCaseTime = Math.floor(Date.now() / 1000);
        
        state.wonItems.forEach(item => {
            if (item.rarity === 'extra-spin') {
                state.balance += 1;
            } else if (item.rarity !== 'nothing') {
                state.inventory.push(item);
            }
        });
        
        saveState();
        updateUI();
    }

    // Show the results of opening
    function showResults() {
        elements.resultPhase.style.display = 'flex';
        elements.multiResultContainer.innerHTML = '';
        
        // Create item cards for won items
        state.wonItems.forEach(item => {
            const itemCard = document.createElement('div');
            itemCard.className = 'item-card';
            
            const itemGlow = document.createElement('div');
            itemGlow.className = 'item-glow';
            itemCard.appendChild(itemGlow);
            
            itemCard.innerHTML += `
                <img src="${item.image}" alt="${item.name}">
                <div class="item-details">
                    <h2>${item.name}</h2>
                    <div class="rarity-badge ${item.rarity || 'common'}">${getRarityText(item)}</div>
                    <p>${item.flavor}</p>
                </div>
            `;
            
            elements.multiResultContainer.appendChild(itemCard);
            
            // Create confetti for special items
            if (item.strength === '5/5' || item.rarity === 'extra-spin' || 
                item.rarity === 'free-shipping' || item.rarity === 'discount-20') {
                createConfetti();
            }
        });
        
        // Play sound based on result
        playSound(state.wonItems.some(item => item.rarity !== 'nothing') ? 'win' : 'lose');
        
        // Vibrate if supported
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    // Continue after viewing results
    function continueAfterWin() {
        elements.resultPhase.style.display = 'none';
        elements.unlockPhase.style.opacity = '1';
        state.isOpening = false;
        updateUI();
    }

    // Check if user is eligible for free case
    function checkFreeCase() {
        if (!state.lastCaseTime) return;
        
        const now = Math.floor(Date.now() / 1000);
        const timePassed = now - state.lastCaseTime;
        
        if (timePassed >= config.freeCaseInterval) {
            const freeCases = Math.floor(timePassed / config.freeCaseInterval);
            state.balance += freeCases;
            state.lastCaseTime = now;
            saveState();
            updateUI();
        }
    }

    // Start the free case timer
    function startFreeCaseTimer() {
        setInterval(() => {
            state.freeCaseTimeLeft--;
            updateFreeCaseTimer();
            localStorage.setItem('freeCaseTimeLeft', state.freeCaseTimeLeft);
            
            if (state.freeCaseTimeLeft <= 0) {
                state.balance++;
                state.freeCaseTimeLeft = config.freeCaseInterval;
                saveState();
                updateUI();
            }
        }, 1000);
    }

    // Update the free case timer display
    function updateFreeCaseTimer() {
        const hours = Math.floor(state.freeCaseTimeLeft / 3600);
        const minutes = Math.floor((state.freeCaseTimeLeft % 3600) / 60);
        const seconds = state.freeCaseTimeLeft % 60;
        elements.freeCaseTimer.textContent = 
            `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
    }

    // Update all UI elements
    function updateUI() {
        elements.balanceEl.textContent = state.balance;
        elements.profileBalance.textContent = state.balance;
        elements.totalOpened.textContent = state.stats.totalOpened;
        updateOpenButtonText();
        elements.openBtn.disabled = state.balance < state.selectedCount;
    }

    // Update the open button text
    function updateOpenButtonText() {
        elements.openBtn.textContent = state.selectedCount > 1 ? 
            `ОТКРЫТЬ ${state.selectedCount} КЕЙСА` : 
            'ОТКРЫТЬ 1 КЕЙС';
    }

    // Toggle between light and dark theme
    function toggleTheme() {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // Apply a theme
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        elements.themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    // Show the inventory modal
    function showInventory() {
        elements.inventoryItems.innerHTML = '';
        state.inventory.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'inventory-item';
            itemEl.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <h3>${item.name}</h3>
                <p>${item.flavor}</p>
                ${item.strength ? `<p class="strength">${item.strength}</p>` : ''}
            `;
            elements.inventoryItems.appendChild(itemEl);
        });
        elements.inventoryModal.style.display = 'flex';
    }

    // Hide the inventory modal
    function hideInventory() {
        elements.inventoryModal.style.display = 'none';
    }

    // Play a sound
    function playSound(type) {
        const sound = document.getElementById(`${type}-sound`);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.5;
            sound.play().catch(e => console.log("Error playing sound:", e));
        }
    }

    // Create confetti effect
    function createConfetti() {
        const colors = ['#00B4D8', '#90E0EF', '#0096C7', '#0077B6', '#48CAE4', '#00F5FF'];
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.width = `${Math.random() * 10 + 5}px`;
            confetti.style.height = `${Math.random() * 10 + 5}px`;
            confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
            
            document.body.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 3000);
        }
    }

    // Get rarity text for display
    function getRarityText(item) {
        const rarityMap = {
            'common': 'ОБЫЧНЫЙ',
            'rare': 'РЕДКИЙ',
            'mythical': 'МИФИЧЕСКИЙ',
            'legendary': 'ЛЕГЕНДАРНЫЙ',
            'nothing': 'ПУСТО',
            'discount-5': 'СКИДКА 5%',
            'discount-10': 'СКИДКА 10%',
            'discount-15': 'СКИДКА 15%',
            'discount-20': 'СКИДКА 20%',
            'free-shipping': 'БЕСПЛАТНАЯ ДОСТАВКА',
            'extra-spin': 'ДОП. ПРОКРУТ'
        };
        return rarityMap[item.rarity] || 'ОБЫЧНЫЙ';
    }

    // Save state to localStorage
    function saveState() {
        localStorage.setItem('inventory', JSON.stringify(state.inventory));
        localStorage.setItem('stats', JSON.stringify(state.stats));
        localStorage.setItem('balance', state.balance);
        localStorage.setItem('lastCaseTime', state.lastCaseTime);
    }

    // Initialize the application4
    init();
});