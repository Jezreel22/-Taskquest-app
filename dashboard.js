/* =====================================================
   DASHBOARD MODULE — Visualizations & Stats
   ===================================================== */

const Dashboard = (() => {
    function render() {
        renderStreakCard();
        renderRankCard();
        renderTodayCard();
        renderWeeklyChart();
    }

    function renderStreakCard() {
        const gamData = Gamification.checkStreakStatus();
        const streakEl = document.getElementById('dashboard-streak');
        if (streakEl) streakEl.textContent = gamData.streak;

        // Render streak calendar
        const calendarEl = document.getElementById('streak-calendar');
        if (!calendarEl) return;

        const days = Gamification.getStreakCalendar();
        calendarEl.innerHTML = days.map(day => `
            <div class="streak-day ${day.active ? 'active' : ''} ${day.isToday ? 'today' : ''}" 
                 title="${day.date}${day.active ? ' ✅' : ''}"></div>
        `).join('');
    }

    function renderRankCard() {
        const gamData = Storage.getGamification();
        const rank = Gamification.getRank(gamData.xp);
        const nextRank = Gamification.getNextRank(rank.index);
        const progress = Gamification.getRankProgress(gamData.xp, rank.index);

        const emojiEl = document.getElementById('dashboard-rank-emoji');
        const titleEl = document.getElementById('dashboard-rank-title');
        const fillEl = document.getElementById('rank-progress-fill');
        const nextNameEl = document.getElementById('next-rank-name');
        const nextEmojiEl = document.getElementById('next-rank-emoji');

        if (emojiEl) emojiEl.innerHTML = `<i class="fa-solid ${rank.iconClass}" style="color:${rank.color}"></i>`;
        if (titleEl) titleEl.textContent = rank.name;
        if (fillEl) fillEl.style.width = `${progress}%`;

        if (nextRank) {
            if (nextNameEl) nextNameEl.textContent = nextRank.name;
            if (nextEmojiEl) nextEmojiEl.innerHTML = `<i class="fa-solid ${nextRank.iconClass}" style="color:${nextRank.color}"></i>`;
        } else {
            if (nextNameEl) nextNameEl.textContent = 'MAX RANK!';
            if (nextEmojiEl) nextEmojiEl.innerHTML = `<i class="fa-solid fa-trophy" style="color:#9b59b6"></i>`;
        }

        // Render rank ladder
        renderRankLadder(rank.index);
    }

    function renderRankLadder(currentIndex) {
        const ladderEl = document.getElementById('rank-ladder');
        if (!ladderEl) return;

        ladderEl.innerHTML = Gamification.RANKS.map((r, i) => {
            let cls = '';
            if (i === currentIndex) cls = 'active';
            else if (i < currentIndex) cls = 'completed';
            return `
                <div class="rank-ladder-item ${cls}">
                    <span class="rank-ladder-emoji"><i class="fa-solid ${r.iconClass}" style="color:${r.color}"></i></span>
                    <span class="rank-ladder-name">${r.name}</span>
                </div>
            `;
        }).join('');
    }

    function renderTodayCard() {
        const container = document.getElementById('today-tasks-list');
        const countEl = document.getElementById('today-task-count');
        if (!container) return;

        const today = new Date().toISOString().split('T')[0];
        const tasks = Storage.getTasks().filter(t => {
            if (t.status === 'completed') return false;
            if (!t.dueDate) return false;
            return t.dueDate <= today;
        }).sort((a, b) => {
            const order = { urgent: 0, high: 1, medium: 2, low: 3 };
            return (order[a.priority] || 2) - (order[b.priority] || 2);
        });

        if (countEl) countEl.textContent = tasks.length;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state mini">
                    <p>No tasks due today! 🎉 Add one to get started.</p>
                </div>`;
            return;
        }

        container.innerHTML = tasks.slice(0, 8).map(task => `
            <div class="today-task-item" data-id="${task.id}">
                <button class="today-task-check" data-action="complete" data-id="${task.id}" aria-label="Complete">
                    <i class="fa-solid fa-check"></i>
                </button>
                <span class="today-task-title">${escapeHtml(task.title)}</span>
                <span class="today-task-priority priority-tag-${task.priority}">${task.priority}</span>
            </div>
        `).join('');

        // Attach events
        container.querySelectorAll('[data-action="complete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Tasks.completeTask(btn.dataset.id);
            });
        });
    }

    function renderWeeklyChart() {
        const container = document.getElementById('weekly-chart');
        if (!container) return;

        const weekData = Gamification.getWeeklyActivity();
        const maxScore = Math.max(...weekData.map(d => d.score), 1);

        container.innerHTML = weekData.map(day => {
            const height = Math.max((day.score / maxScore) * 120, 4);
            return `
                <div class="chart-bar-group">
                    <div class="chart-bar" style="height: ${height}px; ${day.isToday ? 'background: linear-gradient(180deg, var(--clr-secondary), var(--clr-primary));' : ''}">
                        <span class="chart-bar-value">${day.score}</span>
                    </div>
                    <span class="chart-label" style="${day.isToday ? 'color: var(--clr-secondary); font-weight: 700;' : ''}">${day.dayName}</span>
                </div>
            `;
        }).join('');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return { render };
})();
