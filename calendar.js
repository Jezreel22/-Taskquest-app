/* =====================================================
   CALENDAR MODULE — Month View with Task Indicators
   ===================================================== */

const Calendar = (() => {
    let currentDate = new Date();

    function render() {
        const container = document.getElementById('calendar-grid');
        if (!container) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Update header
        const options = { month: 'long', year: 'numeric' };
        document.getElementById('calendar-month-year').textContent = currentDate.toLocaleDateString('en-US', options);

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        container.innerHTML = '';

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            container.innerHTML += '<div class="calendar-cell empty"></div>';
        }

        // Add days of month
        const tasks = Storage.getTasks();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayTasks = tasks.filter(t => t.dueDate === dateStr && t.status !== 'completed');
            const completedTasks = tasks.filter(t => t.dueDate === dateStr && t.status === 'completed');

            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            let cellClass = 'calendar-cell';
            if (isToday) cellClass += ' today';
            if (dayTasks.length > 0) cellClass += ' has-tasks';
            if (completedTasks.length > 0) cellClass += ' has-completed';

            let cellHTML = `<div class="${cellClass}" data-date="${dateStr}">
                <div class="calendar-day-num">${day}</div>
                <div class="calendar-task-indicators">`;

            // Task indicators
            if (dayTasks.length > 0) {
                const urgent = dayTasks.filter(t => t.priority === 'urgent').length;
                const high = dayTasks.filter(t => t.priority === 'high').length;
                const medium = dayTasks.filter(t => t.priority === 'medium').length;

                if (urgent > 0) cellHTML += `<span class="task-dot urgent" title="${urgent} urgent tasks"></span>`;
                if (high > 0) cellHTML += `<span class="task-dot high" title="${high} high priority tasks"></span>`;
                if (medium > 0) cellHTML += `<span class="task-dot medium" title="${medium} medium priority tasks"></span>`;
            }

            if (completedTasks.length > 0) {
                cellHTML += `<span class="task-dot completed" title="${completedTasks.length} completed tasks"></span>`;
            }

            cellHTML += `</div></div>`;
            container.innerHTML += cellHTML;
        }

        // Add event listeners
        document.querySelectorAll('.calendar-cell[data-date]').forEach(cell => {
            cell.addEventListener('click', () => {
                const date = cell.dataset.date;
                showDayTasks(date);
            });
        });
    }

    function showDayTasks(dateStr) {
        const tasks = Storage.getTasks().filter(t => t.dueDate === dateStr && t.status !== 'completed');
        const completed = Storage.getTasks().filter(t => t.dueDate === dateStr && t.status === 'completed');

        if (tasks.length === 0 && completed.length === 0) {
            Tasks.showToast('info', 'No tasks', `No tasks scheduled for ${dateStr}`);
            return;
        }

        // Show in a modal or navigate to tasks view
        Tasks.showToast('info', 'Tasks for ' + dateStr, `${tasks.length} pending, ${completed.length} completed`);
    }

    function nextMonth() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        render();
    }

    function prevMonth() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        render();
    }

    function init() {
        document.getElementById('calendar-next-btn').addEventListener('click', nextMonth);
        document.getElementById('calendar-prev-btn').addEventListener('click', prevMonth);
        render();
    }

    return { init, render };
})();
