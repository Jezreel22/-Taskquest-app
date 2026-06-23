/* =====================================================
   TASKS MODULE — CRUD Operations & Rendering
   ===================================================== */

const Tasks = (() => {
    let currentFilter = 'all';
    let currentSort = 'dueDate';
    let searchQuery = '';
    let deleteTargetId = null;

    const PRIORITY_LABELS = {
        low:    '<i class="fa-solid fa-circle" style="color:#2ecc71"></i> Low',
        medium: '<i class="fa-solid fa-circle" style="color:#f39c12"></i> Medium',
        high:   '<i class="fa-solid fa-circle" style="color:#e67e22"></i> High',
        urgent: '<i class="fa-solid fa-circle" style="color:#e74c3c"></i> Urgent',
    };

    const CATEGORY_ICONS = {
        work:     '<i class="fa-solid fa-briefcase"></i>',
        personal: '<i class="fa-solid fa-house"></i>',
        health:   '<i class="fa-solid fa-dumbbell"></i>',
        learning: '<i class="fa-solid fa-graduation-cap"></i>',
        creative: '<i class="fa-solid fa-palette"></i>',
    };

    function generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    function createTask(data) {
        const score = Gamification.calculateTaskScore(data.priority, data.complexity || 3);
        const recurrence = data.recurrence || 'none';
        const recurrenceEnd = data.recurrenceEnd || '';
        
        // Generate parent task
        const task = {
            id: generateId(),
            title: data.title,
            description: data.description || '',
            priority: data.priority || 'medium',
            category: data.category || 'personal',
            dueDate: data.dueDate || '',
            dueTime: data.dueTime || '',
            complexity: parseInt(data.complexity) || 3,
            alarm: data.alarm || false,
            recurrence: recurrence,
            recurrenceEnd: recurrenceEnd,
            status: 'pending',
            score,
            createdAt: new Date().toISOString(),
            completedAt: null,
            isRecurringInstance: false,
            parentId: null,
        };

        Storage.addTask(task);
        
        // Generate recurring instances if applicable
        if (recurrence !== 'none' && task.dueDate) {
            generateRecurringInstances(task);
        }
        
        Mascot.onTaskAdded();
        showToast('success', 'Task Created', `"${task.title}" has been added! (+${score} XP potential)`);
        renderAll();
        return task;
    }

    function generateRecurringInstances(parentTask) {
        if (!parentTask.dueDate || parentTask.recurrence === 'none') return;
        
        const startDate = new Date(parentTask.dueDate);
        const endDate = parentTask.recurrenceEnd ? new Date(parentTask.recurrenceEnd) : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days default
        
        let currentDate = new Date(startDate);
        const instances = [];
        
        while (currentDate <= endDate) {
            if (currentDate > startDate) {
                const instance = {
                    id: generateId(),
                    title: parentTask.title,
                    description: parentTask.description,
                    priority: parentTask.priority,
                    category: parentTask.category,
                    dueDate: currentDate.toISOString().split('T')[0],
                    dueTime: parentTask.dueTime,
                    complexity: parentTask.complexity,
                    alarm: parentTask.alarm,
                    recurrence: 'none',
                    status: 'pending',
                    score: parentTask.score,
                    createdAt: new Date().toISOString(),
                    completedAt: null,
                    isRecurringInstance: true,
                    parentId: parentTask.id,
                };
                instances.push(instance);
                Storage.addTask(instance);
            }
            
            // Increment date based on recurrence pattern
            switch (parentTask.recurrence) {
                case 'daily':
                    currentDate.setDate(currentDate.getDate() + 1);
                    break;
                case 'weekly':
                    currentDate.setDate(currentDate.getDate() + 7);
                    break;
                case 'biweekly':
                    currentDate.setDate(currentDate.getDate() + 14);
                    break;
                case 'monthly':
                    currentDate.setMonth(currentDate.getMonth() + 1);
                    break;
            }
        }
    }

    function editTask(id, data) {
        const score = Gamification.calculateTaskScore(data.priority, data.complexity || 3);
        const recurrence = data.recurrence || 'none';
        
        Storage.updateTask(id, { ...data, score, recurrence });
        showToast('info', 'Task Updated', `"${data.title}" has been updated.`);
        renderAll();
    }

    function deleteTask(id) {
        const task = Storage.getTaskById(id);
        Storage.deleteTask(id);
        Mascot.onTaskDeleted();
        showToast('warning', 'Task Deleted', `"${task?.title || 'Task'}" has been removed.`);
        renderAll();
    }

    function completeTask(id) {
        const task = Storage.getTaskById(id);
        if (!task || task.status === 'completed') return;

        Storage.updateTask(id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
        });

        const result = Gamification.completeTask(task);
        Mascot.onTaskCompleted(result);

        if (result.rankUp) {
            Mascot.onRankUp(result.rankUp);
            showToast('success', '<i class="fa-solid fa-medal"></i> Rank Up!', `You've reached ${result.rankUp.name}!`);
        }

        if (result.gamData.streak > 1) {
            Mascot.onStreakUpdate(result.gamData.streak);
        }

        showToast('success', 'Task Completed!', `+${result.score} XP earned!`);

        if (result.onTimeBonus) {
            setTimeout(() => {
                showToast('success', '<i class="fa-solid fa-clock"></i> On Time! +50% bonus', 'Great job completing this on schedule!');
            }, 600);
        }

        renderAll();
        Dashboard.render();
    }

    function uncompleteTask(id) {
        Storage.updateTask(id, {
            status: 'pending',
            completedAt: null,
        });
        renderAll();
        Dashboard.render();
    }

    // ---- Rendering ----
    function renderTasksList() {
        const container = document.getElementById('tasks-list');
        const emptyState = document.getElementById('tasks-empty-state');
        if (!container) return;

        let tasks = Storage.getTasks().filter(t => t.status !== 'completed');

        // Apply category filter
        if (currentFilter !== 'all') {
            tasks = tasks.filter(t => t.category === currentFilter);
        }

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        // Apply sort
        tasks = sortTasks(tasks, currentSort);

        if (tasks.length === 0) {
            container.innerHTML = '';
            if (emptyState) {
                container.appendChild(emptyState);
                emptyState.classList.remove('hidden');
            }
            return;
        }

        container.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
        attachTaskEventListeners(container);
    }

    function renderCompletedList() {
        const container = document.getElementById('completed-list');
        if (!container) return;

        const tasks = Storage.getTasks()
            .filter(t => t.status === 'completed')
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

        // Update stats
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const completedToday = tasks.filter(t => t.completedAt && t.completedAt.startsWith(today)).length;
        const completedWeek = tasks.filter(t => t.completedAt && new Date(t.completedAt) >= weekAgo).length;

        const totalEl = document.getElementById('completed-total');
        const todayEl = document.getElementById('completed-today');
        const weekEl = document.getElementById('completed-week');

        if (totalEl) totalEl.textContent = tasks.length;
        if (todayEl) todayEl.textContent = completedToday;
        if (weekEl) weekEl.textContent = completedWeek;

        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🏆</div>
                    <h3>No completed tasks yet</h3>
                    <p>Complete tasks to see them here and earn XP!</p>
                </div>`;
            return;
        }

        container.innerHTML = tasks.map(task => renderTaskCard(task, true)).join('');
        attachTaskEventListeners(container);
    }

    function renderTaskCard(task, isCompleted = false) {
        const dueInfo = getDueInfo(task);
        const priorityClass = `priority-${task.priority}`;

        return `
            <div class="task-card ${priorityClass} ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                <button class="task-checkbox ${isCompleted ? 'checked' : ''}"
                        data-action="${isCompleted ? 'uncomplete' : 'complete'}"
                        data-id="${task.id}"
                        aria-label="${isCompleted ? 'Mark as pending' : 'Mark as complete'}">
                    <i class="fa-solid fa-check"></i>
                </button>
                <div class="task-content">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <div class="task-meta">
                        <span class="task-meta-item">${CATEGORY_ICONS[task.category] || '<i class="fa-solid fa-tag"></i>'} ${task.category}</span>
                        ${task.dueDate ? `<span class="task-meta-item ${dueInfo.class}">${dueInfo.icon} ${dueInfo.text}</span>` : ''}
                        ${task.alarm ? '<span class="task-meta-item"><i class="fa-regular fa-bell"></i></span>' : ''}
                    </div>
                </div>
                <div class="task-score"><i class="fa-solid fa-star score-star"></i> ${task.score}</div>
                <div class="task-actions">
                    ${!isCompleted ? `
                        <button class="task-action-btn edit" data-action="edit" data-id="${task.id}" aria-label="Edit task">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    ` : ''}
                    <button class="task-action-btn delete" data-action="delete" data-id="${task.id}" aria-label="Delete task">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>`;
    }

    function getDueInfo(task) {
        if (!task.dueDate) return { text: '', icon: '', class: '' };

        const now = new Date();
        const due = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
        const diffMs = due - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = Math.floor(diffHours / 24);

        const calIcon  = '<i class="fa-regular fa-calendar"></i>';
        const clockIcon = '<i class="fa-regular fa-clock"></i>';
        const warnIcon  = '<i class="fa-solid fa-triangle-exclamation"></i>';

        if (task.status === 'completed') {
            return { text: formatDate(task.dueDate), icon: calIcon, class: '' };
        }

        if (diffMs < 0) {
            return { text: 'Overdue', icon: warnIcon, class: 'overdue' };
        }
        if (diffHours < 2) {
            return { text: 'Due very soon!', icon: clockIcon, class: 'overdue' };
        }
        if (diffHours < 24) {
            return { text: `Due in ${Math.ceil(diffHours)}h`, icon: clockIcon, class: 'due-soon' };
        }
        if (diffDays === 0) {
            return { text: 'Due today', icon: calIcon, class: 'due-soon' };
        }
        if (diffDays === 1) {
            return { text: 'Due tomorrow', icon: calIcon, class: '' };
        }
        return { text: formatDate(task.dueDate), icon: calIcon, class: '' };
    }

    function sortTasks(tasks, sortBy) {
        return [...tasks].sort((a, b) => {
            switch (sortBy) {
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'priority': {
                    const order = { urgent: 0, high: 1, medium: 2, low: 3 };
                    return (order[a.priority] || 2) - (order[b.priority] || 2);
                }
                case 'score':
                    return b.score - a.score;
                case 'createdAt':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                default:
                    return 0;
            }
        });
    }

    function attachTaskEventListeners(container) {
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'complete':
                        completeTask(id);
                        break;
                    case 'uncomplete':
                        uncompleteTask(id);
                        break;
                    case 'edit':
                        openEditModal(id);
                        break;
                    case 'delete':
                        openDeleteModal(id);
                        break;
                }
            });
        });
    }

    // ---- Recommendations rendering ----
    // Use a Map to store rec objects — avoids fragile JSON-in-HTML-attribute pattern
    const _recMap = new Map();

    function renderRecommendations() {
        const container = document.getElementById('recommendations-list');
        if (!container) return;

        const recs = Recommendations.generateRecommendations();
        _recMap.clear();

        if (recs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🧠</div>
                    <h3>Complete more tasks to get suggestions</h3>
                    <p>The recommendation engine needs at least 3 completed tasks to start analysing your patterns.</p>
                </div>`;
            return;
        }

        // Store each rec in the Map keyed by its index
        recs.forEach((rec, i) => _recMap.set(String(i), rec));

        container.innerHTML = recs.map((rec, i) => `
            <div class="rec-card" data-rec-id="${i}">
                <div class="rec-card-icon">${rec.icon}</div>
                <div class="rec-card-title">${escapeHtml(rec.title)}</div>
                <div class="rec-card-desc">${escapeHtml(rec.desc)}</div>
                <div class="rec-card-meta">
                    <span class="rec-tag">${escapeHtml(rec.category)}</span>
                    <span class="rec-tag priority-tag-${rec.priority}">${PRIORITY_LABELS[rec.priority] || rec.priority}</span>
                    <span class="rec-tag">${escapeHtml(rec.reason)}</span>
                </div>
            </div>
        `).join('');

        // Click to pre-fill task modal with recommendation data
        container.querySelectorAll('.rec-card').forEach(card => {
            card.addEventListener('click', () => {
                const rec = _recMap.get(card.dataset.recId);
                if (!rec) return;
                openModalWithData({
                    title: rec.title,
                    description: rec.desc,
                    priority: rec.priority,
                    category: rec.category,
                    complexity: rec.complexity,
                });
            });
        });
    }

    // ---- Modal Management ----
    function openCreateModal() {
        resetForm();
        document.getElementById('modal-title').textContent = 'New Task ✨';
        document.getElementById('task-modal-overlay').classList.add('active');

        // Set default due date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-due-date').value = today;
    }

    function openEditModal(id) {
        const task = Storage.getTaskById(id);
        if (!task || task.isRecurringInstance) return; // Don't edit recurring instances

        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-due-date').value = task.dueDate || '';
        document.getElementById('task-due-time').value = task.dueTime || '';
        document.getElementById('task-complexity').value = task.complexity || 3;
        document.getElementById('task-alarm').checked = task.alarm || false;
        document.getElementById('task-recurrence').value = task.recurrence || 'none';
        document.getElementById('task-recurrence-end').value = task.recurrenceEnd || '';
        
        // Show/hide recurrence end date field
        const endGroup = document.getElementById('task-recurrence-end-group');
        if (endGroup) {
            endGroup.style.display = task.recurrence && task.recurrence !== 'none' ? 'block' : 'none';
        }
        
        document.getElementById('modal-title').textContent = 'Edit Task ✏️';
        document.getElementById('task-modal-overlay').classList.add('active');
    }

    function openModalWithData(data) {
        resetForm();
        document.getElementById('modal-title').textContent = 'New Task ✨';

        if (data.title) document.getElementById('task-title').value = data.title;
        if (data.description) document.getElementById('task-description').value = data.description;
        if (data.priority) document.getElementById('task-priority').value = data.priority;
        if (data.category) document.getElementById('task-category').value = data.category;
        if (data.complexity) document.getElementById('task-complexity').value = data.complexity;

        const today = new Date().toISOString().split('T')[0];
        document.getElementById('task-due-date').value = today;

        document.getElementById('task-modal-overlay').classList.add('active');
    }

    function closeModal() {
        document.getElementById('task-modal-overlay').classList.remove('active');
        resetForm();
    }

    function openDeleteModal(id) {
        deleteTargetId = id;
        document.getElementById('delete-modal-overlay').classList.add('active');
    }

    function closeDeleteModal() {
        deleteTargetId = null;
        document.getElementById('delete-modal-overlay').classList.remove('active');
    }

    function confirmDelete() {
        if (deleteTargetId) {
            deleteTask(deleteTargetId);
            closeDeleteModal();
        }
    }

    function resetForm() {
        document.getElementById('task-form').reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-complexity').value = 3;
    }

    function handleFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('task-id').value;
        const data = {
            title: document.getElementById('task-title').value.trim(),
            description: document.getElementById('task-description').value.trim(),
            priority: document.getElementById('task-priority').value,
            category: document.getElementById('task-category').value,
            dueDate: document.getElementById('task-due-date').value,
            dueTime: document.getElementById('task-due-time').value,
            complexity: parseInt(document.getElementById('task-complexity').value),
            alarm: document.getElementById('task-alarm').checked,
            recurrence: document.getElementById('task-recurrence').value,
            recurrenceEnd: document.getElementById('task-recurrence-end').value,
        };

        if (!data.title) return;

        if (id) {
            editTask(id, data);
        } else {
            createTask(data);
        }

        closeModal();
    }

    function setFilter(category) {
        currentFilter = category;
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === category);
        });
        renderTasksList();
    }

    function setSort(sortBy) {
        currentSort = sortBy;
        renderTasksList();
    }

    function setSearch(query) {
        searchQuery = query;
        renderTasksList();
    }

    function renderAll() {
        renderTasksList();
        renderCompletedList();
        renderRecommendations();
        updateSidebarStats();
    }

    function updateSidebarStats() {
        const gamData = Gamification.checkStreakStatus();
        const rank = Gamification.getRank(gamData.xp);
        const nextRank = Gamification.getNextRank(rank.index);
        const progress = Gamification.getRankProgress(gamData.xp, rank.index);

        // Sidebar stats
        document.getElementById('rank-icon').innerHTML = `<i class="fa-solid ${rank.iconClass}" style="color:${rank.color}"></i>`;
        document.getElementById('rank-name').textContent = rank.name;
        document.getElementById('xp-fill').style.width = `${progress}%`;
        document.getElementById('xp-text').textContent = nextRank
            ? `${gamData.xp} / ${nextRank.minXP} XP`
            : `${gamData.xp} XP (MAX)`;
        document.getElementById('streak-count').textContent = gamData.streak;
        document.getElementById('total-score').textContent = gamData.totalScore;
        document.getElementById('tasks-done').textContent = gamData.tasksCompleted;
    }

    // ---- Helpers ----
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr + 'T00:00:00');
        const options = { month: 'short', day: 'numeric' };
        return d.toLocaleDateString('en-US', options);
    }

    function showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: '<i class="fa-solid fa-circle-check"></i>',
            warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
            error:   '<i class="fa-solid fa-circle-xmark"></i>',
            info:    '<i class="fa-solid fa-circle-info"></i>',
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('exiting');
            setTimeout(() => toast.remove(), 300);
        });

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('exiting');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    return {
        createTask, editTask, deleteTask, completeTask, uncompleteTask,
        renderTasksList, renderCompletedList, renderRecommendations, renderAll,
        openCreateModal, openEditModal, closeModal, openModalWithData,
        openDeleteModal, closeDeleteModal, confirmDelete,
        handleFormSubmit,
        setFilter, setSort, setSearch,
        updateSidebarStats, showToast,
    };
})();
