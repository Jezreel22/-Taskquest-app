/* =====================================================
   ACHIEVEMENTS MODULE — Badges & Milestones
   ===================================================== */

const Achievements = (() => {
    const ACHIEVEMENTS = {
        'first_task': {
            id: 'first_task',
            name: 'Getting Started',
            description: 'Complete your first task',
            icon: '🎯',
            condition: () => Gamification.getData().totalTasksCompleted >= 1,
        },
        'task_master': {
            id: 'task_master',
            name: 'Task Master',
            description: 'Complete 10 tasks',
            icon: '⭐',
            condition: () => Gamification.getData().totalTasksCompleted >= 10,
        },
        'productivity_pro': {
            id: 'productivity_pro',
            name: 'Productivity Pro',
            description: 'Complete 50 tasks',
            icon: '🚀',
            condition: () => Gamification.getData().totalTasksCompleted >= 50,
        },
        'streak_warrior': {
            id: 'streak_warrior',
            name: 'Streak Warrior',
            description: 'Reach a 7-day streak',
            icon: '🔥',
            condition: () => Gamification.getData().streak >= 7,
        },
        'week_warrior': {
            id: 'week_warrior',
            name: 'Week Warrior',
            description: 'Reach a 30-day streak',
            icon: '💪',
            condition: () => Gamification.getData().streak >= 30,
        },
        'speed_demon': {
            id: 'speed_demon',
            name: 'Speed Demon',
            description: 'Complete 3 tasks in 1 hour',
            icon: '⚡',
            condition: () => checkSpeedDemon(),
        },
        'morning_person': {
            id: 'morning_person',
            name: 'Morning Person',
            description: 'Complete a task before 9 AM',
            icon: '🌅',
            condition: () => Storage.getAchievements().includes('morning_person'),
        },
        'night_owl': {
            id: 'night_owl',
            name: 'Night Owl',
            description: 'Complete a task after 9 PM',
            icon: '🌙',
            condition: () => Storage.getAchievements().includes('night_owl'),
        },
        'rank_up': {
            id: 'rank_up',
            name: 'First Rank Up',
            description: 'Reach Apprentice rank',
            icon: '📚',
            condition: () => Gamification.getRank(Gamification.getData().xp).name !== 'Novice',
        },
        'legend': {
            id: 'legend',
            name: 'Legend',
            description: 'Reach Sage rank',
            icon: '👑',
            condition: () => Gamification.getRank(Gamification.getData().xp).name === 'Sage',
        },
    };

    function checkSpeedDemon() {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentCompleted = Storage.getTasks().filter(t =>
            t.status === 'completed' &&
            new Date(t.completedAt) >= oneHourAgo
        );
        return recentCompleted.length >= 3;
    }

    function getUnlockedAchievements() {
        const unlocked = Storage.getAchievements() || [];
        return Object.values(ACHIEVEMENTS).filter(ach => unlocked.includes(ach.id));
    }

    function getLockedAchievements() {
        const unlocked = Storage.getAchievements() || [];
        return Object.values(ACHIEVEMENTS).filter(ach => !unlocked.includes(ach.id));
    }

    function checkAndUnlockAchievements() {
        const unlocked = Storage.getAchievements() || [];
        const newUnlocks = [];

        Object.values(ACHIEVEMENTS).forEach(ach => {
            if (!unlocked.includes(ach.id) && ach.condition()) {
                unlocked.push(ach.id);
                newUnlocks.push(ach);
            }
        });

        if (newUnlocks.length > 0) {
            Storage.setAchievements(unlocked);
            newUnlocks.forEach(ach => {
                Tasks.showToast('success', '🏆 Achievement Unlocked!', ach.name + ': ' + ach.description);
                Mascot.celebrate();
            });
        }

        return newUnlocks;
    }

    function render() {
        const container = document.getElementById('achievements-grid');
        if (!container) return;

        const unlocked = getUnlockedAchievements();
        const locked = getLockedAchievements();

        if (unlocked.length === 0 && locked.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fa-solid fa-star"></i></div>
                    <h3>No achievements yet</h3>
                    <p>Start completing tasks to unlock badges!</p>
                </div>`;
            return;
        }

        container.innerHTML = [...unlocked, ...locked].map(ach => `
            <div class="achievement-badge ${unlocked.includes(ach) ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${ach.icon}</div>
                <div class="achievement-name">${ach.name}</div>
                <div class="achievement-desc">${ach.description}</div>
            </div>
        `).join('');
    }

    return {
        checkAndUnlockAchievements,
        getUnlockedAchievements,
        getLockedAchievements,
        render,
    };
})();
