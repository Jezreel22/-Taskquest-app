/* =====================================================
   GAMIFICATION MODULE — Streaks, Ranks, Scoring, XP
   ===================================================== */

const Gamification = (() => {
    // Rank hierarchy
    const RANKS = [
        { name: 'Novice',     iconClass: 'fa-seedling',  minXP: 0,    color: '#95a5a6' },
        { name: 'Apprentice', iconClass: 'fa-book-open', minXP: 100,  color: '#3498db' },
        { name: 'Achiever',   iconClass: 'fa-star',      minXP: 350,  color: '#f39c12' },
        { name: 'Expert',     iconClass: 'fa-fire',      minXP: 800,  color: '#e74c3c' },
        { name: 'Legend',     iconClass: 'fa-crown',     minXP: 1500, color: '#9b59b6' },
    ];

    // Score multipliers
    const PRIORITY_SCORES = {
        low:    5,
        medium: 10,
        high:   20,
        urgent: 35,
    };

    const COMPLEXITY_MULTIPLIER = [0, 1, 1.25, 1.5, 2, 3]; // index 1-5

    // Streak bonuses
    const STREAK_BONUS = (streak) => {
        if (streak >= 30) return 2.0;
        if (streak >= 14) return 1.5;
        if (streak >= 7)  return 1.25;
        if (streak >= 3)  return 1.1;
        return 1.0;
    };

    function calculateTaskScore(priority, complexity) {
        const base = PRIORITY_SCORES[priority] || 10;
        const mult = COMPLEXITY_MULTIPLIER[complexity] || 1;
        return Math.round(base * mult);
    }

    function getRank(xp) {
        let rankIndex = 0;
        for (let i = RANKS.length - 1; i >= 0; i--) {
            if (xp >= RANKS[i].minXP) {
                rankIndex = i;
                break;
            }
        }
        return { ...RANKS[rankIndex], index: rankIndex };
    }

    function getNextRank(currentRankIndex) {
        if (currentRankIndex >= RANKS.length - 1) return null;
        return RANKS[currentRankIndex + 1];
    }

    function getRankProgress(xp, currentRankIndex) {
        const current = RANKS[currentRankIndex];
        const next = RANKS[currentRankIndex + 1];
        if (!next) return 100; // max rank
        const rangeStart = current.minXP;
        const rangeEnd = next.minXP;
        const progress = ((xp - rangeStart) / (rangeEnd - rangeStart)) * 100;
        return Math.min(Math.max(progress, 0), 100);
    }

    function getToday() {
        return new Date().toISOString().split('T')[0];
    }

    function updateStreak(gamData) {
        const today = getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (gamData.lastCompletionDate === today) {
            // Already completed today, streak stays
            return gamData;
        }

        if (gamData.lastCompletionDate === yesterdayStr) {
            // Consecutive day!
            gamData.streak += 1;
        } else if (gamData.lastCompletionDate !== today) {
            // Streak broken or first completion
            gamData.streak = 1;
        }

        gamData.lastCompletionDate = today;
        gamData.longestStreak = Math.max(gamData.longestStreak, gamData.streak);
        return gamData;
    }

    function completeTask(task) {
        let gamData = Storage.getGamification();
        const today = getToday();

        // Calculate base score
        const score = calculateTaskScore(task.priority, task.complexity || 3);
        const streakBonus = STREAK_BONUS(gamData.streak);

        // On-time bonus: +50% if completed within 30 min of due time
        let onTimeBonus = false;
        if (task.dueDate && task.dueTime) {
            const due = new Date(`${task.dueDate}T${task.dueTime}`);
            const now = new Date();
            const minsAfterDue = (now - due) / (1000 * 60); // negative = early, positive = late
            // Reward completing on time or up to 30 min early/late
            if (minsAfterDue >= -60 && minsAfterDue <= 30) {
                onTimeBonus = true;
            }
        }

        const onTimeMultiplier = onTimeBonus ? 1.5 : 1;
        const finalScore = Math.round(score * streakBonus * onTimeMultiplier);

        // Update gamification data
        gamData.totalScore += finalScore;
        gamData.xp         += finalScore;
        gamData.tasksCompleted += 1;

        // Update streak
        gamData = updateStreak(gamData);

        // Update daily history
        if (!gamData.dailyHistory[today]) {
            gamData.dailyHistory[today] = { tasksCompleted: 0, score: 0 };
        }
        gamData.dailyHistory[today].tasksCompleted += 1;
        gamData.dailyHistory[today].score          += finalScore;

        // Check rank
        const newRank    = getRank(gamData.xp);
        const oldRankIndex = gamData.rankIndex;
        gamData.rankIndex  = newRank.index;

        Storage.saveGamification(gamData);

        return {
            score: finalScore,
            streakBonus,
            onTimeBonus,
            gamData,
            rankUp: newRank.index > oldRankIndex ? newRank : null,
        };
    }

    function checkStreakStatus() {
        const gamData = Storage.getGamification();
        const today = getToday();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // If last completion was before yesterday, streak is broken
        if (gamData.lastCompletionDate && 
            gamData.lastCompletionDate !== today && 
            gamData.lastCompletionDate !== yesterdayStr) {
            gamData.streak = 0;
            Storage.saveGamification(gamData);
        }

        return gamData;
    }

    function getWeeklyActivity() {
        const gamData = Storage.getGamification();
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const dayData = gamData.dailyHistory[dateStr] || { tasksCompleted: 0, score: 0 };
            days.push({
                date: dateStr,
                dayName: dayNames[d.getDay()],
                ...dayData,
                isToday: i === 0,
            });
        }
        return days;
    }

    function getStreakCalendar() {
        const gamData = Storage.getGamification();
        const days = [];
        const today = new Date();

        // Show last 21 days (3 weeks)
        for (let i = 20; i >= 0; i--) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const hasActivity = gamData.dailyHistory[dateStr] && gamData.dailyHistory[dateStr].tasksCompleted > 0;
            days.push({
                date: dateStr,
                active: hasActivity,
                isToday: i === 0,
            });
        }
        return days;
    }

    return {
        RANKS,
        calculateTaskScore,
        getRank,
        getNextRank,
        getRankProgress,
        completeTask,
        checkStreakStatus,
        getWeeklyActivity,
        getStreakCalendar,
    };
})();
