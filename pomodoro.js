/* =====================================================
   POMODORO MODULE — Focus Timer with Breaks
   ===================================================== */

const Pomodoro = (() => {
    let isRunning = false;
    let sessionTime = 25 * 60; // 25 minutes in seconds
    let breakTime = 5 * 60; // 5 minute break
    let timeLeft = sessionTime;
    let isBreak = false;
    let intervalId = null;

    function init() {
        // Pomodoro timer will be opened via modal
        const startBtn = document.getElementById('pomodoro-start-btn');
        const pauseBtn = document.getElementById('pomodoro-pause-btn');
        const resetBtn = document.getElementById('pomodoro-reset-btn');

        if (startBtn) startBtn.addEventListener('click', start);
        if (pauseBtn) pauseBtn.addEventListener('click', pause);
        if (resetBtn) resetBtn.addEventListener('click', reset);

        updateDisplay();
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateDisplay() {
        const displayEl = document.getElementById('pomodoro-timer');
        const statusEl = document.getElementById('pomodoro-status');

        if (displayEl) displayEl.textContent = formatTime(timeLeft);
        if (statusEl) {
            statusEl.textContent = isBreak ? '☕ Break Time!' : '🎯 Focus Session';
        }
    }

    function start() {
        if (isRunning) return;
        isRunning = true;

        intervalId = setInterval(() => {
            timeLeft--;

            if (timeLeft <= 0) {
                complete();
            }

            updateDisplay();
        }, 1000);

        const startBtn = document.getElementById('pomodoro-start-btn');
        if (startBtn) startBtn.disabled = true;
    }

    function pause() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(intervalId);

        const startBtn = document.getElementById('pomodoro-start-btn');
        if (startBtn) startBtn.disabled = false;
    }

    function reset() {
        pause();
        isBreak = false;
        timeLeft = sessionTime;
        updateDisplay();
    }

    function complete() {
        // Play sound
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.frequency.setValueAtTime(800, audio.currentTime);
        gain.gain.setValueAtTime(0.3, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audio.currentTime + 0.5);
        osc.start(audio.currentTime);
        osc.stop(audio.currentTime + 0.5);

        pause();

        if (!isBreak) {
            isBreak = true;
            timeLeft = breakTime;
            Tasks.showToast('success', 'Session Complete!', 'Time for a break! ☕');
        } else {
            isBreak = false;
            timeLeft = sessionTime;
            Tasks.showToast('success', 'Break Over!', 'Ready for another session? 🎯');
        }

        updateDisplay();
    }

    return { init, start, pause, reset, formatTime };
})();
