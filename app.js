// Screens
const screenSetup = document.getElementById('screen-setup');
const screenQuiz = document.getElementById('screen-quiz');
const screenResult = document.getElementById('screen-result');
const screenStats = document.getElementById('screen-stats');

// Inputs
const inputMaxResult = document.getElementById('max-result');
const chkMul = document.getElementById('op-mul');
const chkDiv = document.getElementById('op-div');
const chkAdd = document.getElementById('op-add');
const chkSub = document.getElementById('op-sub');
const inputAnswer = document.getElementById('answer-input');

// UI Elements
const taskText = document.getElementById('task-text');
const progressText = document.getElementById('progress-text');
const scoreText = document.getElementById('score-text');
const feedbackText = document.getElementById('feedback-text');
const historyContainer = document.getElementById('history-container');

// Stats Elements
const statRounds = document.getElementById('stat-rounds');
const statTotal = document.getElementById('stat-total');
const statCorrect = document.getElementById('stat-correct');
const statPercent = document.getElementById('stat-percent');

// Chart Elements
const btnChartDay = document.getElementById('btn-chart-day');
const btnChartWeek = document.getElementById('btn-chart-week');
const btnChartMonth = document.getElementById('btn-chart-month');
let currentChartPeriod = 'day';
let chartInstance = null;

// Buttons
document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-cancel').addEventListener('click', showSetup);
document.getElementById('btn-submit').addEventListener('click', checkAnswer);
document.getElementById('btn-restart').addEventListener('click', showSetup);
document.getElementById('btn-stats').addEventListener('click', showStats);
document.getElementById('btn-close-stats').addEventListener('click', showSetup);
document.getElementById('btn-reset-stats').addEventListener('click', resetStats);

btnChartDay.addEventListener('click', () => setChartPeriod('day'));
btnChartWeek.addEventListener('click', () => setChartPeriod('week'));
btnChartMonth.addEventListener('click', () => setChartPeriod('month'));

// Globals
let tasks = [];
let currentTaskIndex = 0;
let currentHistory = [];

// Screen Navigation
function switchScreen(screen) {
    screenSetup.classList.remove('active');
    screenQuiz.classList.remove('active');
    screenResult.classList.remove('active');
    screenStats.classList.remove('active');
    screen.classList.add('active');
}

function showSetup() {
    switchScreen(screenSetup);
}

// Statistics Logic (LocalStorage)
function migrateOldStats() {
    const old = localStorage.getItem('1mal1_stats');
    if (old) {
        try {
            const oldStats = JSON.parse(old);
            if (oldStats.totalTasks > 0) {
                const hist = loadHistory();
                hist.push({
                    date: new Date().toISOString(),
                    correct: oldStats.correctTasks,
                    total: oldStats.totalTasks,
                    isLegacy: true // from before date tracking
                });
                saveHistory(hist);
            }
            localStorage.removeItem('1mal1_stats');
        } catch(e) {}
    }
}

function loadHistory() {
    return JSON.parse(localStorage.getItem('1mal1_history')) || [];
}

function saveHistory(historyArray) {
    localStorage.setItem('1mal1_history', JSON.stringify(historyArray));
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
    return d.getUTCFullYear() + "-W" + (weekNo < 10 ? '0'+weekNo : weekNo);
}

function groupHistory(history, period) {
    const groups = {};
    history.forEach(entry => {
        const d = new Date(entry.date);
        let key = '';
        if (period === 'day') {
            key = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (period === 'week') {
            key = "KW " + getWeekNumber(d).split('-W')[1] + " (" + d.getFullYear() + ")";
        } else if (period === 'month') {
            key = d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric' });
        }
        
        if (!groups[key]) {
            groups[key] = { correct: 0, total: 0 };
        }
        groups[key].correct += entry.correct;
        groups[key].total += entry.total;
    });
    
    // Sort keys chronologically by parsing them back or just rely on chronological insertion (since history is appended)
    // A simple chronological sort based on the first date found in each group
    const sortedKeys = Object.keys(groups);
    
    const labels = sortedKeys;
    const data = labels.map(label => {
        const g = groups[label];
        return Math.round((g.correct / g.total) * 100);
    });
    
    return { labels, data };
}

function setChartPeriod(period) {
    currentChartPeriod = period;
    btnChartDay.classList.toggle('active', period === 'day');
    btnChartWeek.classList.toggle('active', period === 'week');
    btnChartMonth.classList.toggle('active', period === 'month');
    updateChart();
}

function updateChart() {
    const history = loadHistory();
    const { labels, data } = groupHistory(history, currentChartPeriod);
    
    const ctx = document.getElementById('statsChart').getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Erfolgsquote (%)',
                data: data,
                borderColor: '#007aff',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#007aff',
                pointRadius: 4,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) { return value + '%' }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function showStats() {
    migrateOldStats();
    const history = loadHistory();
    
    let totalRounds = history.length;
    let totalTasks = 0;
    let totalCorrect = 0;
    
    history.forEach(h => {
        totalTasks += h.total;
        totalCorrect += h.correct;
    });

    statRounds.textContent = totalRounds;
    statTotal.textContent = totalTasks;
    statCorrect.textContent = totalCorrect;
    statPercent.textContent = totalTasks > 0 ? Math.round((totalCorrect / totalTasks) * 100) + '%' : '0%';
    
    switchScreen(screenStats);
    updateChart();
}

function resetStats() {
    if (confirm("Möchtest du die Statistiken wirklich löschen?")) {
        saveHistory([]);
        showStats();
    }
}

// Math Helpers
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTask(type, maxResult) {
    let a, b, result;
    const maxFactor = Math.max(10, Math.ceil(Math.sqrt(maxResult)));

    switch(type) {
        case 'mul':
            a = randomInt(2, maxFactor);
            b = randomInt(2, maxFactor);
            while (a * b > maxResult) {
                a = randomInt(2, maxFactor);
                b = randomInt(2, maxFactor);
            }
            return { text: `${a} ✖️ ${b} =`, answer: a * b, fullText: `${a} ✖️ ${b} = ${a * b}` };
            
        case 'div':
            b = randomInt(2, maxFactor);
            result = randomInt(2, maxFactor);
            while (b * result > maxResult) {
                b = randomInt(2, maxFactor);
                result = randomInt(2, maxFactor);
            }
            a = b * result;
            return { text: `${a} ➗ ${b} =`, answer: result, fullText: `${a} ➗ ${b} = ${result}` };
            
        case 'add':
            result = randomInt(2, maxResult);
            a = randomInt(1, result - 1);
            b = result - a;
            return { text: `${a} ➕ ${b} =`, answer: result, fullText: `${a} ➕ ${b} = ${result}` };
            
        case 'sub':
            a = randomInt(2, maxResult);
            b = randomInt(1, a - 1);
            result = a - b;
            return { text: `${a} ➖ ${b} =`, answer: result, fullText: `${a} ➖ ${b} = ${result}` };
    }
}

// Game Logic
function startGame() {
    const maxRes = parseInt(inputMaxResult.value, 10) || 100;
    
    const useMul = chkMul.checked;
    const useDiv = chkDiv.checked;
    const useAdd = chkAdd.checked;
    const useSub = chkSub.checked;

    const availableOthers = [];
    if (useDiv) availableOthers.push('div');
    if (useAdd) availableOthers.push('add');
    if (useSub) availableOthers.push('sub');

    if (!useMul && availableOthers.length === 0) {
        alert("Bitte wähle mindestens eine Rechenart aus!");
        return;
    }

    tasks = [];
    currentHistory = [];
    currentTaskIndex = 0;

    let numMul = 0;
    let numOthers = 0;

    if (useMul && availableOthers.length > 0) {
        numMul = 5;
        numOthers = 5;
    } else if (useMul && availableOthers.length === 0) {
        numMul = 10;
        numOthers = 0;
    } else if (!useMul && availableOthers.length > 0) {
        numMul = 0;
        numOthers = 10;
    }

    for (let i = 0; i < numMul; i++) {
        tasks.push(generateTask('mul', maxRes));
    }

    for (let i = 0; i < numOthers; i++) {
        const randomOp = availableOthers[randomInt(0, availableOthers.length - 1)];
        tasks.push(generateTask(randomOp, maxRes));
    }

    // Shuffle
    for (let i = tasks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
    }

    switchScreen(screenQuiz);
    showNextTask();
}

function showNextTask() {
    if (currentTaskIndex >= tasks.length) {
        finishGame();
        return;
    }

    const task = tasks[currentTaskIndex];
    taskText.textContent = task.text;
    progressText.textContent = `Aufgabe ${currentTaskIndex + 1} / ${tasks.length}`;
    inputAnswer.value = '';
    
    setTimeout(() => {
        inputAnswer.focus();
    }, 100);
}

inputAnswer.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        checkAnswer();
    }
});

function checkAnswer() {
    const userAnswerStr = inputAnswer.value.trim();
    if (userAnswerStr === '') return;

    const userAnswer = parseInt(userAnswerStr, 10);
    const currentTask = tasks[currentTaskIndex];
    const isCorrect = (userAnswer === currentTask.answer);

    currentHistory.push({
        task: currentTask.text,
        fullTask: currentTask.fullText,
        userAnswer: userAnswer,
        correctAnswer: currentTask.answer,
        isCorrect: isCorrect
    });

    currentTaskIndex++;
    showNextTask();
}

function finishGame() {
    switchScreen(screenResult);
    
    const correctCount = currentHistory.filter(h => h.isCorrect).length;
    scoreText.textContent = `${correctCount}/${tasks.length}`;
    
    // In Historie speichern
    const globalHistory = loadHistory();
    globalHistory.push({
        date: new Date().toISOString(),
        correct: correctCount,
        total: tasks.length
    });
    saveHistory(globalHistory);
    
    if (correctCount === tasks.length) {
        feedbackText.textContent = "Perfekt! 🎉";
    } else if (correctCount >= tasks.length * 0.7) {
        feedbackText.textContent = "Sehr gut! 👍";
    } else {
        feedbackText.textContent = "Das kannst du noch besser! 💪";
    }

    historyContainer.innerHTML = '';
    currentHistory.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        
        const taskSpan = document.createElement('span');
        taskSpan.textContent = item.task;
        
        const answerSpan = document.createElement('span');
        if (item.isCorrect) {
            answerSpan.innerHTML = `<span class="correct">${item.correctAnswer}</span>`;
        } else {
            answerSpan.innerHTML = `<span class="wrong">${item.userAnswer}</span> <span class="correct">${item.correctAnswer}</span>`;
        }

        div.appendChild(taskSpan);
        div.appendChild(answerSpan);
        historyContainer.appendChild(div);
    });
}

// Initialisiere die Historie falls nötig aus alten Daten
migrateOldStats();
