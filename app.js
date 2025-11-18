// Exercise configuration
const EXERCISES = {
    pushup: { name: 'PUSHUP', met: 6.0, secPerRep: 2.0, isWalking: false },
    pullup: { name: 'PULLUP', met: 7.0, secPerRep: 3.0, isWalking: false },
    situp: { name: 'SITUP', met: 2.8, secPerRep: 2.0, isWalking: false },
    bicepcurl: { name: 'BICEP CURL', met: 3.5, secPerRep: 3.0, isWalking: false },
    walk: { name: 'WALK', met: 3.5, secPerRep: 0, isWalking: true }
};

// Default user data
const DEFAULT_USER_DATA = {
    weightKg: 86,
    heightCm: 178
};

// Calorie calculation functions
// Using alpha = 0.047 to match reference values (math.txt suggests 0.06, but reference uses ~0.047)
function calculateCalories(weightKg, reps, secPerRep, MET, alpha = 0.047) {
    if (reps === 0) {
        return {
            reps: 0,
            duration_hours: 0,
            base_kcal: 0,
            adjusted_kcal: 0,
            kcal_per_rep: 0,
            adjusted_kcal_per_rep: 0,
            fatigue_multiplier: 1
        };
    }

    const duration_hours = (reps * secPerRep) / 3600;
    const base_kcal = MET * weightKg * duration_hours;
    const fatigue_multiplier = 1 + alpha * Math.log(1 + reps);
    const adjusted_kcal = base_kcal * fatigue_multiplier;

    return {
        reps: reps,
        duration_hours: duration_hours,
        base_kcal: base_kcal,
        adjusted_kcal: adjusted_kcal,
        kcal_per_rep: base_kcal / Math.max(reps, 1),
        adjusted_kcal_per_rep: adjusted_kcal / Math.max(reps, 1),
        fatigue_multiplier: fatigue_multiplier
    };
}

function calculateWalkingCalories(weightKg, distanceKm, walkingSpeedKmh = 5) {
    if (distanceKm === 0) {
        return {
            distance_km: 0,
            duration_hours: 0,
            base_kcal: 0,
            adjusted_kcal: 0
        };
    }

    const minutesWalked = (distanceKm / walkingSpeedKmh) * 60;
    const duration_hours = minutesWalked / 60;
    const MET = 3.5; // Normal pace
    const base_kcal = MET * weightKg * duration_hours;
    const adjusted_kcal = base_kcal; // No fatigue for walking

    return {
        distance_km: distanceKm,
        duration_hours: duration_hours,
        base_kcal: base_kcal,
        adjusted_kcal: adjusted_kcal
    };
}

// LocalStorage management
function getUserData() {
    const data = localStorage.getItem('workoutUserData');
    return data ? JSON.parse(data) : DEFAULT_USER_DATA;
}

function saveUserData(data) {
    localStorage.setItem('workoutUserData', JSON.stringify(data));
}

function getWorkoutData(dateKey) {
    const data = localStorage.getItem(`workout_${dateKey}`);
    return data ? JSON.parse(data) : null;
}

function saveWorkoutData(dateKey, data) {
    localStorage.setItem(`workout_${dateKey}`, JSON.stringify(data));
}

function getAllWorkoutData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('workout_')) {
            const dateKey = key.replace('workout_', '');
            data[dateKey] = JSON.parse(localStorage.getItem(key));
        }
    }
    return data;
}

// Date utilities
function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

function formatDate(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    
    return {
        dayName: days[date.getDay()],
        dateText: `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    };
}

function getShortDayName(date) {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return days[date.getDay()];
}

// App state
let currentDate = new Date();
currentDate.setHours(0, 0, 0, 0);
let currentDayIndex = 5; // Index in the carousel (5 = today, 4 = yesterday, etc.)
const MAX_DAYS_BACK = 5;
let confettiTriggered = {}; // Track which dates have triggered confetti

// Ensure currentDate is within valid range (today or up to 5 days back)
function ensureValidDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((today - currentDate) / (1000 * 60 * 60 * 24));
    
    // If date is in the future or more than 5 days back, set to today
    if (currentDate > today || daysDiff > 5) {
        currentDate = new Date(today);
    }
}

// Initialize app
function init() {
    ensureValidDate();
    loadUserData();
    setupDaysCarousel();
    setupEventListeners();
    updateDetailGraph();
    updateSummaryStats();
    preventPullToRefresh();
}

// Create carousel with day pages
function setupDaysCarousel() {
    const carousel = document.getElementById('days-carousel');
    carousel.innerHTML = '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Create pages for today and up to 5 days back
    // Index 0 = 5 days ago, Index 5 = today
    for (let i = MAX_DAYS_BACK; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayPage = createDayPage(date, i);
        carousel.appendChild(dayPage);
    }
    
    // Set initial position to show today (index 5)
    currentDayIndex = MAX_DAYS_BACK;
    updateCarouselPosition();
    updateNavButtons();
}

function createDayPage(date, index) {
    const dayPage = document.createElement('div');
    dayPage.className = 'day-page';
    dayPage.dataset.dayIndex = index;
    dayPage.dataset.dateKey = getDateKey(date);
    
    const dateInfo = formatDate(date);
    
    dayPage.innerHTML = `
        <div class="top-section">
            <div class="header">
                <div class="date-info">
                    <div class="day-navigation">
                        <button class="nav-chevron nav-chevron-left" data-action="prev">&lt;</button>
                        <div class="day-name">${dateInfo.dayName}</div>
                        <button class="nav-chevron nav-chevron-right" data-action="next">&gt;</button>
                    </div>
                    <div class="date-text">${dateInfo.dateText}</div>
                </div>
                <div class="calories-display day-calories" data-date-key="${getDateKey(date)}">0 cal</div>
            </div>
            <div class="graph-container day-graph-container" data-date-key="${getDateKey(date)}">
                <div class="graph-wrapper day-graph" data-date-key="${getDateKey(date)}">
                    <!-- Graph bars will be generated by JS -->
                </div>
            </div>
        </div>
        <div class="bottom-section">
            <div class="workout-card" data-exercise="pushup">
                <div class="workout-name">PUSHUP</div>
                <div class="workout-value-container">
                    <input type="number" inputmode="numeric" class="workout-input" data-exercise="pushup" data-date-key="${getDateKey(date)}" min="0" step="1" />
                    <div class="workout-value" data-exercise="pushup" data-date-key="${getDateKey(date)}">0</div>
                </div>
            </div>
            <div class="workout-card" data-exercise="pullup">
                <div class="workout-name">PULLUP</div>
                <div class="workout-value-container">
                    <input type="number" inputmode="numeric" class="workout-input" data-exercise="pullup" data-date-key="${getDateKey(date)}" min="0" step="1" />
                    <div class="workout-value" data-exercise="pullup" data-date-key="${getDateKey(date)}">0</div>
                </div>
            </div>
            <div class="workout-card" data-exercise="situp">
                <div class="workout-name">SITUP</div>
                <div class="workout-value-container">
                    <input type="number" inputmode="numeric" class="workout-input" data-exercise="situp" data-date-key="${getDateKey(date)}" min="0" step="1" />
                    <div class="workout-value" data-exercise="situp" data-date-key="${getDateKey(date)}">0</div>
                </div>
            </div>
            <div class="workout-card" data-exercise="bicepcurl">
                <div class="workout-name">BICEP CURL</div>
                <div class="workout-value-container">
                    <input type="number" inputmode="numeric" class="workout-input" data-exercise="bicepcurl" data-date-key="${getDateKey(date)}" min="0" step="1" />
                    <div class="workout-value" data-exercise="bicepcurl" data-date-key="${getDateKey(date)}">0</div>
                </div>
            </div>
            <div class="workout-card" data-exercise="walk">
                <div class="workout-name">WALK</div>
                <div class="workout-value-container">
                    <input type="number" inputmode="decimal" class="workout-input" data-exercise="walk" data-date-key="${getDateKey(date)}" min="0" step="0.1" />
                    <div class="workout-value" data-exercise="walk" data-date-key="${getDateKey(date)}">0</div>
                </div>
            </div>
        </div>
    `;
    
    // Load data for this day
    loadDayPageData(dayPage, date);
    
    return dayPage;
}

function loadDayPageData(dayPage, date) {
    const dateKey = getDateKey(date);
    const workoutData = getWorkoutData(dateKey) || {};
    const userData = getUserData();
    
    let totalCalories = 0;
    
    // Update workout values
    Object.keys(EXERCISES).forEach(exerciseKey => {
        const exercise = EXERCISES[exerciseKey];
        const value = workoutData[exerciseKey] || 0;
        const valueElement = dayPage.querySelector(`.workout-value[data-exercise="${exerciseKey}"][data-date-key="${dateKey}"]`);
        
        if (valueElement) {
            if (exercise.isWalking) {
                valueElement.textContent = value > 0 ? `${value}KM` : '0';
            } else {
                valueElement.textContent = value > 0 ? value : '0';
            }
        }
        
        // Calculate calories
        if (value > 0) {
            if (exercise.isWalking) {
                const calc = calculateWalkingCalories(userData.weightKg, value);
                totalCalories += calc.adjusted_kcal;
            } else {
                const calc = calculateCalories(userData.weightKg, value, exercise.secPerRep, exercise.met);
                totalCalories += calc.adjusted_kcal;
            }
        }
    });
    
    // Update calories display
    const caloriesElement = dayPage.querySelector(`.day-calories[data-date-key="${dateKey}"]`);
    if (caloriesElement) {
        caloriesElement.textContent = `${Math.round(totalCalories)} cal`;
    }
    
    // Update graph for this day
    updateDayGraph(dayPage, date);
}

function updateDayGraph(dayPage, date) {
    const graphWrapper = dayPage.querySelector('.day-graph');
    if (!graphWrapper) return;
    
    graphWrapper.innerHTML = '';
    
    // Show last 7 days ending on this date
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const graphDate = new Date(date);
        graphDate.setDate(graphDate.getDate() - i);
        days.push(graphDate);
    }
    
    const allData = getAllWorkoutData();
    const userData = getUserData();
    let maxCalories = 1;
    
    const dayCalories = days.map(graphDate => {
        const dateKey = getDateKey(graphDate);
        const workoutData = allData[dateKey] || {};
        let total = 0;
        
        Object.keys(EXERCISES).forEach(exerciseKey => {
            const exercise = EXERCISES[exerciseKey];
            const value = workoutData[exerciseKey] || 0;
            
            if (value > 0) {
                if (exercise.isWalking) {
                    const calc = calculateWalkingCalories(userData.weightKg, value);
                    total += calc.adjusted_kcal;
                } else {
                    const calc = calculateCalories(userData.weightKg, value, exercise.secPerRep, exercise.met);
                    total += calc.adjusted_kcal;
                }
            }
        });
        
        maxCalories = Math.max(maxCalories, total);
        return total;
    });
    
    days.forEach((graphDate, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'graph-day';
        
        const bar = document.createElement('div');
        bar.className = 'graph-bar';
        const height = maxCalories > 0 ? (dayCalories[index] / maxCalories) * 150 : 0;
        bar.style.height = `${height}px`;
        
        const label = document.createElement('div');
        label.className = 'graph-label';
        label.textContent = getShortDayName(graphDate);
        
        dayDiv.appendChild(bar);
        dayDiv.appendChild(label);
        graphWrapper.appendChild(dayDiv);
    });
}

function updateCarouselPosition() {
    const carousel = document.getElementById('days-carousel');
    // Each page is 100vw, so translate by viewport width
    const translateX = -currentDayIndex * 100;
    carousel.style.transform = `translate3d(${translateX}vw, 0, 0)`;
    
    // Update current date based on index
    // Index 0 = 5 days ago, Index 5 = today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() - (MAX_DAYS_BACK - currentDayIndex));
    
    // Update detail screen date
    const dateInfo = formatDate(currentDate);
    document.getElementById('detail-day-name').textContent = dateInfo.dayName;
    document.getElementById('detail-date').textContent = dateInfo.dateText;
}

// Prevent pull-to-refresh on mobile
function preventPullToRefresh() {
    let touchStartY = 0;
    
    // Prevent pull-to-refresh on document
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        const currentY = e.touches[0].clientY;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
        
        // If we're at the top (or very close) and trying to pull down, prevent it
        if (scrollTop <= 0 && currentY > touchStartY) {
            e.preventDefault();
            return false;
        }
        
        // If we're at the bottom and trying to pull up, prevent it
        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const clientHeight = document.documentElement.clientHeight || window.innerHeight;
        if (scrollTop + clientHeight >= scrollHeight - 1 && currentY < touchStartY) {
            e.preventDefault();
            return false;
        }
    }, { passive: false });
    
    // Also prevent on window scroll
    window.addEventListener('scroll', (e) => {
        if (window.pageYOffset <= 0) {
            window.scrollTo(0, 0);
        }
    }, { passive: true });
}

function loadUserData() {
    const userData = getUserData();
    document.getElementById('user-weight').value = userData.weightKg;
    document.getElementById('user-height').value = userData.heightCm;
}

// loadCurrentDay is no longer needed - data is loaded per day page

function setupEventListeners() {
    // Use event delegation for workout cards (since they're dynamically created)
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.workout-card');
        if (!card) return;
        
        // Don't trigger if clicking directly on the input
        if (e.target.classList.contains('workout-input')) {
            return;
        }
        
        const exercise = card.dataset.exercise;
        const input = card.querySelector('.workout-input');
        const valueDisplay = card.querySelector('.workout-value');
        const dateKey = input.dataset.dateKey;
        
        // Get current value
        const workoutData = getWorkoutData(dateKey) || {};
        const currentValue = workoutData[exercise] || 0;
        
        // Hide value, show input
        valueDisplay.style.display = 'none';
        input.classList.add('active');
        input.value = currentValue;
        
        // Focus input
        setTimeout(() => {
            input.focus();
            input.select();
        }, 10);
    });
    
    // Handle input blur (when user finishes typing)
    document.addEventListener('blur', (e) => {
        if (e.target.classList.contains('workout-input')) {
            saveInputValue(e.target);
        }
    }, true);
    
    document.addEventListener('keypress', (e) => {
        if (e.target.classList.contains('workout-input') && e.key === 'Enter') {
            e.target.blur();
        }
    });
    
    // Day name tap to go back to today (delegated)
    document.addEventListener('click', (e) => {
        const dayName = e.target.closest('.day-name');
        if (dayName && document.getElementById('home-screen').classList.contains('active')) {
            // Animate back to today
            if (currentDayIndex !== MAX_DAYS_BACK) {
                currentDayIndex = MAX_DAYS_BACK;
                updateCarouselPosition();
                updateNavButtons();
            }
        }
    });
    
    // Also support touch for mobile
    document.addEventListener('touchend', (e) => {
        const dayName = e.target.closest('.day-name');
        if (dayName && document.getElementById('home-screen').classList.contains('active')) {
            e.preventDefault();
            // Animate back to today
            if (currentDayIndex !== MAX_DAYS_BACK) {
                currentDayIndex = MAX_DAYS_BACK;
                updateCarouselPosition();
                updateNavButtons();
            }
        }
    }, { passive: false });
    
    // Graph click to detail page (delegated)
    document.addEventListener('click', (e) => {
        const graphContainer = e.target.closest('.day-graph-container');
        if (graphContainer) {
            showScreen('detail-screen');
            updateDetailGraph();
            updateSummaryStats();
        }
    });
    
    // Back button - support both click and touch
    const backButton = document.getElementById('back-button');
    if (backButton) {
        const handleBack = (e) => {
            console.log('Back button triggered', e.type);
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            showScreen('home-screen');
            return false;
        };
        
        backButton.addEventListener('click', handleBack);
        backButton.addEventListener('touchend', handleBack, { passive: false });
        backButton.addEventListener('touchstart', (e) => {
            // Prevent default to avoid any conflicts
            e.stopPropagation();
        }, { passive: false });
        
        // Also try pointer events as fallback
        backButton.addEventListener('pointerup', handleBack);
    } else {
        console.error('Back button not found');
    }
    
    // Settings icon - support both click and touch
    const settingsIcon = document.getElementById('settings-icon');
    settingsIcon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScreen('settings-screen');
    });
    settingsIcon.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScreen('settings-screen');
    }, { passive: false });
    
    // Settings back button - support both click and touch
    const settingsBackButton = document.getElementById('settings-back-button');
    settingsBackButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScreen('detail-screen');
    });
    settingsBackButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showScreen('detail-screen');
    }, { passive: false });
    
    // Save settings
    document.getElementById('save-settings').addEventListener('click', () => {
        const weight = parseFloat(document.getElementById('user-weight').value);
        const height = parseFloat(document.getElementById('user-height').value);
        
        if (weight && height) {
            saveUserData({ weightKg: weight, heightCm: height });
            // Reload all day pages with new user data
            const carousel = document.getElementById('days-carousel');
            const dayPages = carousel.querySelectorAll('.day-page');
            dayPages.forEach(dayPage => {
                const dateKey = dayPage.dataset.dateKey;
                const date = new Date(dateKey + 'T00:00:00');
                loadDayPageData(dayPage, date);
            });
            updateSummaryStats();
            showScreen('detail-screen');
        }
    });
    
    
    // Swipe navigation on carousel - interactive drag-to-swipe
    const homeScreen = document.getElementById('home-screen');
    const carouselContainer = document.querySelector('.days-carousel-container');
    const carousel = document.getElementById('days-carousel');
    
    if (carouselContainer && carousel) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isDragging = false;
        let initialIndex = 0;
        let lastMoveX = 0;
        let lastMoveTime = 0;
        let velocity = 0;
        
        carouselContainer.addEventListener('touchstart', (e) => {
            // Only on home screen
            if (!homeScreen.classList.contains('active')) return;
            
            // Don't swipe if input is active or clicking buttons
            if (e.target.closest('.workout-input.active') || 
                e.target.closest('button') || 
                e.target.closest('.nav-chevron')) {
                return;
            }
            
            // Only if touching bottom section
            if (e.target.closest('.bottom-section')) {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                currentX = startX;
                initialIndex = currentDayIndex;
                isDragging = true;
                lastMoveX = startX;
                lastMoveTime = Date.now();
                velocity = 0;
                
                // Disable transition during drag
                carousel.style.transition = 'none';
            }
        }, { passive: true });
        
        carouselContainer.addEventListener('touchmove', (e) => {
            if (!homeScreen.classList.contains('active')) return;
            if (!isDragging || startX === 0) return;
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = Math.abs(touch.clientY - startY);
            const moveDeltaX = touch.clientX - lastMoveX;
            const moveTime = Date.now() - lastMoveTime;
            
            // Calculate velocity (pixels per ms)
            if (moveTime > 0) {
                velocity = moveDeltaX / moveTime;
            }
            
            // Determine if this is a horizontal swipe
            if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > deltaY * 1.5) {
                // Prevent scrolling during horizontal swipe
                e.preventDefault();
                
                // Calculate the offset from the current position
                const baseOffset = -initialIndex * 100; // Base offset in vw
                const dragOffset = (deltaX / window.innerWidth) * 100; // Convert pixels to vw
                const totalOffset = baseOffset + dragOffset;
                
                // Apply bounds - don't allow dragging beyond limits
                const minOffset = -MAX_DAYS_BACK * 100;
                const maxOffset = 0;
                const clampedOffset = Math.max(minOffset, Math.min(maxOffset, totalOffset));
                
                // Update carousel position in real-time
                carousel.style.transform = `translate3d(${clampedOffset}vw, 0, 0)`;
                
                lastMoveX = touch.clientX;
                lastMoveTime = Date.now();
            } else if (deltaY > Math.abs(deltaX)) {
                // Vertical scroll detected, cancel drag
                isDragging = false;
                carousel.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
                updateCarouselPosition();
            }
        }, { passive: false });
        
        carouselContainer.addEventListener('touchend', (e) => {
            if (!homeScreen.classList.contains('active')) return;
            if (!isDragging || startX === 0) return;
            
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;
            const deltaXAbs = Math.abs(deltaX);
            const threshold = window.innerWidth * 0.25; // 25% of screen width
            const velocityThreshold = 0.3; // vw per ms
            
            // Re-enable transition
            carousel.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
            
            let newIndex = initialIndex;
            
            // Determine if we should change pages based on distance or velocity
            if (Math.abs(velocity) > velocityThreshold) {
                // Fast swipe - follow velocity direction
                if (velocity < 0) {
                    // Swiping left (negative velocity) - go to previous day (older)
                    if (currentDayIndex < MAX_DAYS_BACK) {
                        newIndex = currentDayIndex + 1;
                    }
                } else {
                    // Swiping right (positive velocity) - go to next day (newer)
                    if (currentDayIndex > 0) {
                        newIndex = currentDayIndex - 1;
                    }
                }
            } else if (deltaXAbs > threshold) {
                // Slow but far swipe - follow direction
                if (deltaX > 0) {
                    // Swipe right - go to next day (newer, towards today)
                    if (currentDayIndex > 0) {
                        newIndex = currentDayIndex - 1;
                    }
                } else {
                    // Swipe left - go to previous day (older, away from today)
                    if (currentDayIndex < MAX_DAYS_BACK) {
                        newIndex = currentDayIndex + 1;
                    }
                }
            }
            
            // Update to new index
            if (newIndex !== currentDayIndex) {
                currentDayIndex = newIndex;
            }
            
            // Snap to position
            updateCarouselPosition();
            updateNavButtons();
            
            // Reset
            startX = 0;
            startY = 0;
            currentX = 0;
            isDragging = false;
            initialIndex = 0;
            lastMoveX = 0;
            lastMoveTime = 0;
            velocity = 0;
        }, { passive: true });
        
        carouselContainer.addEventListener('touchcancel', () => {
            // Reset on cancel
            if (isDragging) {
                carousel.style.transition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
                updateCarouselPosition();
                isDragging = false;
                startX = 0;
                startY = 0;
            }
        }, { passive: true });
    }
}


function goToPreviousDay() {
    // Go to previous day = move to higher index (older day)
    if (currentDayIndex < MAX_DAYS_BACK) {
        currentDayIndex++;
        updateCarouselPosition();
        updateNavButtons();
    }
}

function goToNextDay() {
    // Go to next day = move to lower index (newer day, towards today)
    if (currentDayIndex > 0) {
        currentDayIndex--;
        updateCarouselPosition();
        updateNavButtons();
    }
}

function updateNavButtons() {
    // Update all nav buttons in all day pages
    document.querySelectorAll('.nav-chevron[data-action="prev"]').forEach(btn => {
        if (currentDayIndex >= MAX_DAYS_BACK) {
            btn.style.opacity = '0.3';
            btn.style.pointerEvents = 'none';
        } else {
            btn.style.opacity = '0.8';
            btn.style.pointerEvents = 'auto';
        }
    });
    
    document.querySelectorAll('.nav-chevron[data-action="next"]').forEach(btn => {
        if (currentDayIndex <= 0) {
            btn.style.opacity = '0.3';
            btn.style.pointerEvents = 'none';
        } else {
            btn.style.opacity = '0.8';
            btn.style.pointerEvents = 'auto';
        }
    });
}

function showScreen(screenId) {
    console.log('showScreen called with:', screenId);
    
    // Remove active class from all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Show the requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('Screen activated:', screenId, 'Element:', targetScreen);
        
        // Force a reflow to ensure display change takes effect
        void targetScreen.offsetWidth;
    } else {
        console.error('Screen not found:', screenId);
    }
}

function saveInputValue(input) {
    const exercise = input.dataset.exercise;
    const dateKey = input.dataset.dateKey;
    const value = parseFloat(input.value) || 0;
    
    // Save the data first
    const workoutData = getWorkoutData(dateKey) || {};
    workoutData[exercise] = value;
    saveWorkoutData(dateKey, workoutData);
    
    // Get the card and value display
    const card = input.closest('.workout-card');
    const valueDisplay = card.querySelector('.workout-value');
    const exerciseData = EXERCISES[exercise];
    const dayPage = input.closest('.day-page');
    
    // Hide input, show value
    input.classList.remove('active');
    
    // Update value display immediately
    if (exerciseData.isWalking) {
        valueDisplay.textContent = value > 0 ? `${value}KM` : '0';
    } else {
        valueDisplay.textContent = value > 0 ? value : '0';
    }
    valueDisplay.style.display = 'block';
    
    // Immediately calculate and update calories
    updateDayCalories(dayPage, dateKey);
    
    // Reload day page data to update graph
    const date = new Date(dateKey + 'T00:00:00');
    loadDayPageData(dayPage, date);
    
    // Update detail graphs and stats
    updateDetailGraph();
    updateSummaryStats();
}

function updateDayCalories(dayPage, dateKey) {
    // Get fresh data from localStorage
    const workoutData = getWorkoutData(dateKey) || {};
    const userData = getUserData();
    
    let totalCalories = 0;
    let completedExercises = 0;
    
    // Calculate total calories for all exercises
    Object.keys(EXERCISES).forEach(exerciseKey => {
        const exercise = EXERCISES[exerciseKey];
        const value = workoutData[exerciseKey] || 0;
        
        if (value > 0) {
            completedExercises++;
            if (exercise.isWalking) {
                const calc = calculateWalkingCalories(userData.weightKg, value);
                totalCalories += calc.adjusted_kcal;
            } else {
                const calc = calculateCalories(userData.weightKg, value, exercise.secPerRep, exercise.met);
                totalCalories += calc.adjusted_kcal;
            }
        }
    });
    
    // Update calories display immediately
    const caloriesElement = dayPage.querySelector(`.day-calories[data-date-key="${dateKey}"]`);
    if (caloriesElement) {
        caloriesElement.textContent = `${Math.round(totalCalories)} cal`;
    }
    
    // Check if all 5 exercises are completed and confetti hasn't been triggered for this date
    if (completedExercises === 5 && !confettiTriggered[dateKey]) {
        confettiTriggered[dateKey] = true;
        triggerConfetti();
    } else if (completedExercises < 5) {
        // Reset confetti trigger if exercises are removed
        confettiTriggered[dateKey] = false;
    }
}

function triggerConfetti() {
    // Create confetti canvas
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const confettiCount = 100;
    const gravity = 0.5;
    const terminalVelocity = 5;
    const drag = 0.075;
    
    const colors = [
        { front: '#CD661D', back: '#8B4513' },
        { front: '#FFD700', back: '#FFA500' },
        { front: '#FF6B6B', back: '#FF4757' },
        { front: '#4ECDC4', back: '#45B7B8' },
        { front: '#95E1D3', back: '#6BC4A6' }
    ];
    
    // Initialize confetti particles
    for (let i = 0; i < confettiCount; i++) {
        confetti.push({
            color: colors[Math.floor(Math.random() * colors.length)],
            dimensions: {
                x: Math.random() * 10 + 5,
                y: Math.random() * 10 + 5
            },
            position: {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height
            },
            rotation: Math.random() * 360,
            velocity: {
                x: Math.random() * 50 - 25,
                y: Math.random() * 50 + 50
            }
        });
    }
    
    let animationId;
    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((confetto, index) => {
            const width = confetto.dimensions.x * Math.cos(confetto.rotation);
            const height = confetto.dimensions.x * Math.sin(confetto.rotation);
            
            ctx.save();
            ctx.translate(confetto.position.x, confetto.position.y);
            ctx.rotate(confetto.rotation);
            
            ctx.fillStyle = confetto.color.front;
            ctx.fillRect(-width / 2, -height / 2, width, height);
            
            ctx.fillStyle = confetto.color.back;
            ctx.fillRect(-width / 2, -height / 2, width, height * 0.1);
            
            ctx.restore();
            
            confetto.rotation += confetto.velocity.x * 0.01;
            confetto.position.x += confetto.velocity.x;
            confetto.position.y += confetto.velocity.y;
            confetto.velocity.x *= (1 - drag);
            confetto.velocity.y *= (1 - drag);
            confetto.velocity.y += gravity;
            
            if (confetto.velocity.y > terminalVelocity) {
                confetto.velocity.y = terminalVelocity;
            }
            
            if (confetto.position.y > canvas.height) {
                confetti.splice(index, 1);
            }
        });
        
        if (confetti.length > 0) {
            animationId = requestAnimationFrame(update);
        } else {
            cancelAnimationFrame(animationId);
            canvas.remove();
        }
    }
    
    update();
}

// updateHomeGraph is no longer needed - each day page has its own graph via updateDayGraph

function updateDetailGraph() {
    const graph = document.getElementById('detail-graph');
    graph.innerHTML = '';
    
    // Show last 30 days
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        days.push(date);
    }
    
    const allData = getAllWorkoutData();
    const userData = getUserData();
    let maxCalories = 1;
    
    // Calculate calories for each day
    const dayCalories = days.map(date => {
        const dateKey = getDateKey(date);
        const workoutData = allData[dateKey] || {};
        let total = 0;
        
        Object.keys(EXERCISES).forEach(exerciseKey => {
            const exercise = EXERCISES[exerciseKey];
            const value = workoutData[exerciseKey] || 0;
            
            if (value > 0) {
                if (exercise.isWalking) {
                    const calc = calculateWalkingCalories(userData.weightKg, value);
                    total += calc.adjusted_kcal;
                } else {
                    const calc = calculateCalories(userData.weightKg, value, exercise.secPerRep, exercise.met);
                    total += calc.adjusted_kcal;
                }
            }
        });
        
        maxCalories = Math.max(maxCalories, total);
        return total;
    });
    
    days.forEach((date, index) => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'detail-graph-day';
        
        const bar = document.createElement('div');
        bar.className = 'detail-graph-bar';
        const height = maxCalories > 0 ? (dayCalories[index] / maxCalories) * 250 : 0;
        bar.style.height = `${height}px`;
        
        const label = document.createElement('div');
        label.className = 'detail-graph-label';
        label.textContent = getShortDayName(date);
        
        dayDiv.appendChild(bar);
        dayDiv.appendChild(label);
        graph.appendChild(dayDiv);
    });
}

function updateSummaryStats() {
    const userData = getUserData();
    const allData = getAllWorkoutData();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate streak (consecutive days with workouts ending today)
    let streak = 0;
    let checkDate = new Date(today);
    
    while (checkDate >= firstDayOfMonth) {
        const key = getDateKey(checkDate);
        const data = allData[key];
        
        if (data) {
            let hasWorkout = false;
            Object.keys(EXERCISES).forEach(exerciseKey => {
                const value = data[exerciseKey] || 0;
                if (value > 0) {
                    hasWorkout = true;
                }
            });
            
            if (hasWorkout) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        } else {
            break;
        }
    }
    
    document.getElementById('stat-streak').textContent = `${streak} DAY${streak !== 1 ? 'S' : ''}`;
    
    // Calculate best day (highest calories this month)
    let bestDayCalories = 0;
    let totalCalories = 0;
    let totalDistance = 0;
    
    for (let date = new Date(firstDayOfMonth); date <= today; date.setDate(date.getDate() + 1)) {
        const key = getDateKey(date);
        const data = allData[key];
        
        if (data) {
            let dayCalories = 0;
            Object.keys(EXERCISES).forEach(exerciseKey => {
                const exercise = EXERCISES[exerciseKey];
                const value = data[exerciseKey] || 0;
                
                if (value > 0) {
                    if (exercise.isWalking) {
                        const calc = calculateWalkingCalories(userData.weightKg, value);
                        dayCalories += calc.adjusted_kcal;
                        totalDistance += value; // Add to total distance
                    } else {
                        const calc = calculateCalories(userData.weightKg, value, exercise.secPerRep, exercise.met);
                        dayCalories += calc.adjusted_kcal;
                    }
                }
            });
            
            if (dayCalories > 0) {
                totalCalories += dayCalories;
                if (dayCalories > bestDayCalories) {
                    bestDayCalories = dayCalories;
                }
            }
        }
    }
    
    document.getElementById('stat-best').textContent = `${Math.round(bestDayCalories)} CAL`;
    document.getElementById('stat-distance').textContent = `${Math.round(totalDistance * 10) / 10} KM`;
    document.getElementById('stat-calories').textContent = `${Math.round(totalCalories)} CAL`;
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);

