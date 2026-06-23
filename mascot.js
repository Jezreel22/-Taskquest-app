/* =====================================================
   MASCOT MODULE — Foxy the Interactive Guide
   ===================================================== */

const Mascot = (() => {
    let bubbleTimeout = null;
    let idleTimeout = null;
    let isVisible = true;

    // Context-aware messages organized by event
    const MESSAGES = {
        welcome: [
            "Hey there! Ready to be productive? 🚀",
            "Welcome back! Let's crush some tasks today! 💪",
            "Foxy is here to help! What shall we do? 🦊",
        ],
        taskAdded: [
            "Great job adding a new task! You're on fire! 🔥",
            "Another task lined up! Let's make it happen! ⚡",
            "Awesome! Every task is a step towards greatness! 🌟",
            "Love the initiative! You've got this! 🎯",
        ],
        taskCompleted: [
            "WOOO! Task completed! You're amazing! 🎉",
            "Crushed it! Keep that momentum going! 💪",
            "Another one bites the dust! Fantastic work! ⭐",
            "You're on a roll! Nothing can stop you! 🚀",
            "Victory! That felt good, didn't it? 🏆",
        ],
        taskDeleted: [
            "Task removed! Sometimes clearing the deck is smart. 🧹",
            "Decluttering your list — good thinking! 🧠",
        ],
        streakStarted: [
            "Day 1 of your streak! Let's build something special! 🌱",
        ],
        streakContinued: [
            "Streak extended! Consistency is your superpower! 🔥",
            "The streak grows! You're building great habits! 💫",
        ],
        rankUp: [
            "🎖️ RANK UP! You're now a {rank}! Incredible!",
            "🏅 Level up! Welcome to {rank} status! You've earned it!",
        ],
        idle: [
            "Hey, I'm still here if you need me! 👋",
            "Need help? Click on me for tips! 🦊",
            "How about tackling one more task? You'll feel great! 💪",
            "Remember: progress, not perfection! 🌟",
            "A quick task can boost your mood! Try it! ⚡",
        ],
        encouragement: [
            "You're doing great! Don't give up! 💪",
            "Every expert was once a beginner. Keep going! 🌱",
            "Small progress is still progress! 🚀",
            "I believe in you! Let's do this! 🌟",
        ],
        noTasks: [
            "Your list is empty! How about adding a task? 📝",
            "A fresh start! What would you like to accomplish? 🎯",
        ],
        morning: [
            "Good morning! ☀️ Ready to plan your day?",
            "Rise and shine! Let's make today count! 🌅",
        ],
        afternoon: [
            "Afternoon check-in! How's the progress? 🕐",
            "Halfway through the day! Keep pushing! 💪",
        ],
        evening: [
            "Great evening! Time to wrap up any remaining tasks? 🌙",
            "End the day strong! What else can you tick off? ⭐",
        ],
        onboarding: [
            "Hi there! I'm Foxy, your productivity buddy! 🦊 I'll help you crush your goals and level up every day!",
            "Here's how it works: Add tasks, complete them, and earn XP! 📈 Build streaks and climb the ranks from Novice to Legend! 👑",
            "I'll be right here cheering you on! Click me anytime for tips. Now let's add your first task! 🚀",
        ],
    };

    function init() {
        setupEventListeners();
        
        // Time-based greeting
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) greeting = random(MESSAGES.morning);
        else if (hour < 17) greeting = random(MESSAGES.afternoon);
        else greeting = random(MESSAGES.evening);

        // Show greeting after a short delay
        setTimeout(() => speak(greeting), 1500);
        startIdleTimer();
    }

    function setupEventListeners() {
        const avatar = document.getElementById('mascot-avatar');
        const bubbleClose = document.getElementById('mascot-bubble-close');

        if (avatar) {
            avatar.addEventListener('click', () => {
                speak(random(MESSAGES.encouragement));
            });
        }

        if (bubbleClose) {
            bubbleClose.addEventListener('click', (e) => {
                e.stopPropagation();
                hideBubble();
            });
        }
    }

    function speak(message, duration = 5000) {
        const bubble = document.getElementById('mascot-bubble');
        const textEl = document.getElementById('mascot-text');

        if (!bubble || !textEl) return;

        // Clear existing timeout
        if (bubbleTimeout) clearTimeout(bubbleTimeout);

        textEl.textContent = message;
        bubble.classList.add('visible');
        bubble.style.animation = 'none';
        bubble.offsetHeight; // trigger reflow
        bubble.style.animation = '';

        // Auto-hide after duration
        bubbleTimeout = setTimeout(() => {
            hideBubble();
        }, duration);

        // Reset idle timer
        resetIdleTimer();
    }

    function hideBubble() {
        const bubble = document.getElementById('mascot-bubble');
        if (bubble) bubble.classList.remove('visible');
    }

    function setAnimationState(state) {
        const avatar = document.getElementById('mascot-avatar');
        if (!avatar) return;

        avatar.classList.remove('celebrating', 'encouraging');
        if (state) {
            avatar.classList.add(state);
            setTimeout(() => avatar.classList.remove(state), 1000);
        }
    }

    function onTaskAdded() {
        speak(random(MESSAGES.taskAdded));
        setAnimationState('encouraging');
    }

    function onTaskCompleted(result) {
        let message = random(MESSAGES.taskCompleted);
        message += ` +${result.score} XP!`;
        speak(message, 6000);
        setAnimationState('celebrating');
    }

    function onTaskDeleted() {
        speak(random(MESSAGES.taskDeleted));
    }

    function onRankUp(rank) {
        const message = random(MESSAGES.rankUp).replace('{rank}', rank.name);
        speak(message, 8000);
        setAnimationState('celebrating');
        triggerConfetti();
    }

    function onStreakUpdate(streak) {
        if (streak === 1) {
            speak(random(MESSAGES.streakStarted));
        } else if (streak > 1) {
            speak(`${random(MESSAGES.streakContinued)} (${streak} days!)`, 5000);
        }
    }

    function triggerConfetti() {
        const container = document.createElement('div');
        container.className = 'level-up-particles';
        document.body.appendChild(container);

        const emojis = ['🎉', '⭐', '🏆', '🔥', '💪', '✨', '🎊', '🌟'];
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${60 + Math.random() * 40}%`;
            particle.style.animationDelay = `${Math.random() * 0.5}s`;
            particle.style.animationDuration = `${1 + Math.random() * 1}s`;
            container.appendChild(particle);
        }

        setTimeout(() => container.remove(), 3000);
    }

    function startIdleTimer() {
        idleTimeout = setTimeout(() => {
            const tasks = Storage.getTasks();
            const pending = tasks.filter(t => t.status !== 'completed');
            if (pending.length === 0) {
                speak(random(MESSAGES.noTasks));
            } else {
                speak(random(MESSAGES.idle));
            }
            startIdleTimer(); // Re-schedule
        }, 120000); // 2 minutes idle
    }

    function resetIdleTimer() {
        if (idleTimeout) clearTimeout(idleTimeout);
        startIdleTimer();
    }

    function random(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    return {
        init,
        speak,
        hideBubble,
        onTaskAdded,
        onTaskCompleted,
        onTaskDeleted,
        onRankUp,
        onStreakUpdate,
        triggerConfetti,
        MESSAGES,
    };
})();
