/* =====================================================
   NOTIFICATIONS MODULE — Web Notifications & Audio Alarms
   ===================================================== */

const Notifications = (() => {
    let checkInterval = null;
    let alarmAudio = null;

    // Motivational messages pool for retention
    const MOTIVATIONAL_MESSAGES = [
        { title: "We miss you! 🦊", text: "Foxy's been waiting for you! Your streak is at risk — come back and keep the momentum going!" },
        { title: "Don't break the chain! 🔗", text: "Consistency is the key to greatness. Even one small task today can make a huge difference!" },
        { title: "Your goals miss you! 🎯", text: "Remember why you started. Let's tackle something small and build from there." },
        { title: "Quick win awaits! ⚡", text: "Sometimes all it takes is 5 minutes. Open up and check off one task — you'll feel amazing!" },
        { title: "Foxy believes in you! 💪", text: "Every expert was once a beginner. Your future self will thank you for showing up today." },
        { title: "Level up time! 🚀", text: "You're so close to your next rank! Just a few more tasks and you'll reach new heights." },
        { title: "Streak alert! 🔥", text: "Your streak is counting on you! Don't let yesterday's effort go to waste." },
        { title: "Small steps, big results! 🏔️", text: "Progress isn't about giant leaps. It's about small, consistent steps. Take one now!" },
        { title: "You've got this! 🌟", text: "The hardest part is starting. Once you begin, you'll wonder why you waited!" },
        { title: "Time to shine! ✨", text: "Today is full of potential. Open TaskQuest and turn that potential into progress!" },
    ];

    function init() {
        alarmAudio = document.getElementById('alarm-audio');
        startTaskChecker();
        checkRetention();
    }

    function requestPermission() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return Promise.resolve(false);
        }
        if (Notification.permission === 'granted') return Promise.resolve(true);
        return Notification.requestPermission().then(p => p === 'granted');
    }

    function sendNotification(title, body, tag = 'taskquest') {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            const notification = new Notification(title, {
                body,
                icon: 'mascot.png',
                badge: 'mascot.png',
                tag,
                requireInteraction: true,
            });
            notification.onclick = () => { window.focus(); notification.close(); };
            setTimeout(() => notification.close(), 12000);
        } catch (e) {
            console.log('Notification error:', e);
        }
    }

    // ---- Audio Alarms ----

    // Gentle 3-note pre-warning chime (15 min before)
    function playWarningChime() {
        _playTone([
            { freq: 523.25, start: 0, dur: 0.25 }, // C5
            { freq: 659.25, start: 0.28, dur: 0.25 }, // E5
            { freq: 783.99, start: 0.56, dur: 0.4 }, // G5
        ], 0.4);
    }

    // 1-minute pre-alarm chime — more urgent than warning
    function play1MinuteAlarm() {
        _playTone([
            { freq: 659.25, start: 0, dur: 0.2 }, // E5
            { freq: 783.99, start: 0.25, dur: 0.2 }, // G5
            { freq: 659.25, start: 0.5, dur: 0.2 }, // E5
            { freq: 783.99, start: 0.75, dur: 0.3 }, // G5
        ], 0.5);
    }

    // Urgent 3-beep alarm — fires at exact due time
    function playDueAlarm() {
        _playTone([
            { freq: 880, start: 0, dur: 0.18 },
            { freq: 880, start: 0.25, dur: 0.18 },
            { freq: 880, start: 0.5, dur: 0.18 },
            { freq: 1046.5, start: 0.8, dur: 0.5 },  // high C — resolution note
        ], 0.7);
    }

    function _playTone(notes, volume) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            notes.forEach(({ freq, start, dur }) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
                gain.gain.setValueAtTime(volume, ctx.currentTime + start);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                osc.start(ctx.currentTime + start);
                osc.stop(ctx.currentTime + start + dur + 0.05);
            });
        } catch (e) {
            console.log('Audio alarm error:', e);
        }
    }

    // Keep the old name for any external callers
    function playAlarm() { playWarningChime(); }

    // ---- Task Checker ----

    function startTaskChecker() {
        if (checkInterval) clearInterval(checkInterval);
        checkInterval = setInterval(checkDueTasks, 30000); // Every 30 s for precision
        checkDueTasks(); // immediate check
    }

    function checkDueTasks() {
        const tasks = Storage.getTasks().filter(t => t.status !== 'completed');
        const now = new Date();

        tasks.forEach(task => {
            if (!task.dueDate || !task.dueTime) return; // Skip tasks with no specific time

            const dueDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
            const diffMs = dueDateTime - now;
            const diffMins = diffMs / (1000 * 60);

            // --- 15-minute pre-warning ---
            if (diffMins > 0 && diffMins <= 15 && !task._notified15) {
                sendNotification(
                    '⏰ Task Due Soon!',
                    `"${task.title}" is due in ${Math.ceil(diffMins)} minute${Math.ceil(diffMins) === 1 ? '' : 's'}!`,
                    `warn-${task.id}`
                );
                if (task.alarm) playWarningChime();
                Storage.updateTask(task.id, { _notified15: true });
            }

            // --- 1-minute pre-alarm ---
            if (diffMins > 0 && diffMins <= 1 && !task._notified1min) {
                sendNotification(
                    '⏰⏰ 1 Minute Left!',
                    `"${task.title}" is due in 1 minute. Get ready!`,
                    `1min-${task.id}`
                );
                if (task.alarm) play1MinuteAlarm();
                Storage.updateTask(task.id, { _notified1min: true });
            }

            // --- Exact due time alarm (fires within ±30 s of the scheduled time) ---
            if (Math.abs(diffMins) <= 0.5 && !task._notifiedDue) {
                sendNotification(
                    '🔔 Task Due Now!',
                    `Time to complete: "${task.title}"`,
                    `due-${task.id}`
                );
                if (task.alarm) playDueAlarm();
                Storage.updateTask(task.id, { _notifiedDue: true });

                // Show in-app due-now popup asking the user to confirm completion
                showDueNowModal(task);
            }

            // --- Overdue fallback (within 5 min after due, in case the tab was backgrounded) ---
            if (diffMins < -1 && diffMins > -5 && !task._notifiedOverdue) {
                sendNotification(
                    '🚨 Task Overdue!',
                    `"${task.title}" is now overdue. Mark it complete if you've done it!`,
                    `overdue-${task.id}`
                );
                if (task.alarm && !task._notifiedDue) playDueAlarm();
                Storage.updateTask(task.id, { _notifiedOverdue: true });
            }
        });
    }

    // ---- Due-Now Modal ----

    function showDueNowModal(task) {
        // Reuse the encouragement overlay with task-specific content
        const overlay = document.getElementById('due-now-overlay');
        const titleEl = document.getElementById('due-now-title');
        const bodyEl = document.getElementById('due-now-body');
        const completeBtn = document.getElementById('due-now-complete-btn');
        const snoozeBtn = document.getElementById('due-now-snooze-btn');

        if (!overlay) return;

        if (titleEl) titleEl.textContent = `⏰ Time's up: "${task.title}"`;
        if (bodyEl) bodyEl.textContent = 'Did you complete this task? Mark it done now to earn your XP!';

        // Complete button — marks task complete and closes modal
        if (completeBtn) {
            const handler = () => {
                Tasks.completeTask(task.id);
                overlay.classList.remove('active');
                completeBtn.removeEventListener('click', handler);
            };
            completeBtn.addEventListener('click', handler);
        }

        // Snooze button — adds 10-minute snooze
        if (snoozeBtn) {
            const handler = () => {
                snoozeTask(task);
                overlay.classList.remove('active');
                snoozeBtn.removeEventListener('click', handler);
            };
            snoozeBtn.addEventListener('click', handler);
        }

        overlay.classList.add('active');

        // Auto-close after 60 s if ignored
        setTimeout(() => overlay.classList.remove('active'), 60000);
    }

    function snoozeTask(task) {
        const snoozeUntil = new Date(Date.now() + 10 * 60 * 1000);
        const snoozeTime = snoozeUntil.toTimeString().slice(0, 5); // HH:MM
        const snoozeDate = snoozeUntil.toLocaleDateString('en-CA');

        Storage.updateTask(task.id, {
            dueTime: snoozeTime,
            dueDate: snoozeDate,
            _notified15: false,
            _notified1min: false,
            _notifiedDue: false,
            _notifiedOverdue: false,
        });

        Tasks.showToast('info', 'Snoozed 10 mins', `"${task.title}" rescheduled to ${snoozeTime}.`);
        Tasks.renderAll();
    }

    // ---- Retention Engine ----

    function checkRetention() {
        const lastActive = Storage.getLastActive();
        if (!lastActive) return;

        const hoursSinceActive = (new Date() - new Date(lastActive)) / (1000 * 60 * 60);
        if (hoursSinceActive >= 24) {
            const msg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
            sendNotification(msg.title, msg.text, 'retention');
            showEncouragementModal(msg);
        }
    }

    function showEncouragementModal(msg) {
        const overlay = document.getElementById('encouragement-overlay');
        const titleEl = document.getElementById('encouragement-title');
        const textEl = document.getElementById('encouragement-text');
        if (titleEl) titleEl.textContent = msg.title;
        if (textEl) textEl.textContent = msg.text;
        if (overlay) overlay.classList.add('active');
    }

    function getRandomMotivation() {
        return MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    }

    function destroy() {
        if (checkInterval) clearInterval(checkInterval);
    }

    return {
        init, requestPermission, sendNotification,
        playAlarm, playWarningChime, play1MinuteAlarm, playDueAlarm,
        checkDueTasks, checkRetention,
        getRandomMotivation, showEncouragementModal, destroy,
    };
})();
