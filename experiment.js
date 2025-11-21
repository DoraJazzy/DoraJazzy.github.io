// State management
let participantId = null;
let currentTrial = 0;
let totalTrials = 20;
let trials = [];
let responses = [];

// Audio context for generating beep sound
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to play beep sound using Web Audio API
function playBeep() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz tone
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// DOM Elements
const demographicsScreen = document.getElementById('demographics-screen');
const questionnaireScreen = document.getElementById('questionnaire-screen');
const instructionsScreen = document.getElementById('instructions-screen');
const experimentScreen = document.getElementById('experiment-screen');
const completionScreen = document.getElementById('completion-screen');
const demographicsForm = document.getElementById('demographics-form');
const questionnaireForm = document.getElementById('questionnaire-form');
const startExperimentBtn = document.getElementById('start-experiment-btn');
const stimulusImage = document.getElementById('stimulus-image');
const responseContainer = document.getElementById('response-container');
const responseBtns = document.querySelectorAll('.response-btn');
const currentTrialSpan = document.getElementById('current-trial');
const totalTrialsSpan = document.getElementById('total-trials');
const restartBtn = document.getElementById('restart-btn');

// Initialize
totalTrialsSpan.textContent = totalTrials;

// Submit demographics
demographicsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const age = document.getElementById('age').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/participant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ age: parseInt(age), gender })
        });

        const data = await response.json();
        participantId = data.participantId;
    } catch (error) {
        console.warn('Backend not available. Running in offline mode. Data will not be saved.');
        // Generate a mock participant ID for offline mode
        participantId = 'offline-' + Date.now();
    }

    // Switch to questionnaire
    switchScreen(questionnaireScreen);
});

// Submit questionnaire
questionnaireForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect all 18 answers
    const answers = [];
    for (let i = 1; i <= 18; i++) {
        const answer = parseInt(document.querySelector(`input[name="q${i}"]:checked`).value);
        answers.push(answer);
    }

    // Try to save questionnaire to backend
    try {
        await fetch(`${API_BASE_URL}/api/questionnaire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                participantId,
                answers
            })
        });
    } catch (error) {
        console.warn('Backend not available. Questionnaire not saved:', error);
    }

    // Switch to instructions
    switchScreen(instructionsScreen);
});

// Start experiment
startExperimentBtn.addEventListener('click', () => {
    generateTrials();
    switchScreen(experimentScreen);
    runTrial();
});

// Generate trial sequence
function generateTrials() {
    trials = [];

    for (let i = 0; i < totalTrials; i++) {
        // Randomly decide if there's a delay
        const hasDelay = Math.random() > 0.5;

        // If there's a delay, it's between 50-100ms
        // If no delay, it's 0ms
        const delayMs = hasDelay ? Math.floor(Math.random() * 51) + 50 : 0;

        trials.push({
            trialNumber: i + 1,
            delayMs: delayMs,
            hadDelay: hasDelay,
            imagePath: 'assets/images/stimulus.svg'
        });
    }

    // Shuffle trials to randomize
    trials.sort(() => Math.random() - 0.5);
}

// Run a single trial
async function runTrial() {
    if (currentTrial >= totalTrials) {
        showCompletion();
        return;
    }

    const trial = trials[currentTrial];
    currentTrialSpan.textContent = currentTrial + 1;

    // Hide response buttons
    responseContainer.classList.add('hidden');
    stimulusImage.classList.remove('show');

    // Wait 1 second before presenting stimulus
    await sleep(1000);

    // Present stimulus
    stimulusImage.src = trial.imagePath;

    // Show image
    stimulusImage.classList.add('show');

    // Play sound with delay (using Web Audio API beep)
    setTimeout(() => {
        playBeep();
    }, trial.delayMs);

    // Wait for stimulus to finish (image shows for 200ms)
    await sleep(500);

    // Hide image
    stimulusImage.classList.remove('show');

    // Wait a bit before showing response options
    await sleep(500);

    // Show response options
    responseContainer.classList.remove('hidden');
}

// Handle response
responseBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const userResponse = btn.dataset.response;
        const trial = trials[currentTrial];

        // Calculate correctness locally
        const correct = (trial.hadDelay && userResponse === 'delay') || (!trial.hadDelay && userResponse === 'together');

        // Try to save response to backend
        try {
            await fetch(`${API_BASE_URL}/api/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId,
                    trialNumber: trial.trialNumber,
                    delayMs: trial.delayMs,
                    hadDelay: trial.hadDelay,
                    userResponse
                })
            });
        } catch (error) {
            console.warn('Backend not available. Response not saved:', error);
        }

        // Store response locally regardless of save success
        responses.push({
            ...trial,
            userResponse,
            correct
        });

        // Move to next trial
        currentTrial++;
        runTrial();
    });
});

// Show completion screen
function showCompletion() {
    const correctResponses = responses.filter(r => r.correct).length;
    const accuracy = ((correctResponses / totalTrials) * 100).toFixed(1);

    const resultsSummary = document.getElementById('results-summary');
    resultsSummary.innerHTML = `
        <p>Completed: ${totalTrials} trials</p>
        <p>Correct: ${correctResponses} / ${totalTrials}</p>
        <p>Accuracy: ${accuracy}%</p>
    `;

    switchScreen(completionScreen);
}

// Restart experiment
restartBtn.addEventListener('click', () => {
    participantId = null;
    currentTrial = 0;
    trials = [];
    responses = [];
    demographicsForm.reset();
    questionnaireForm.reset();
    switchScreen(demographicsScreen);
});

// Utility functions
function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
