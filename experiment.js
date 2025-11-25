// State management
let participantId = null;
let currentTrial = 0;
let totalTrials = 20;
let trials = [];
let responses = [];

// Mouse tracking variables
let mouseTrackingData = [];
let responseStartTime = null;
let isTrackingMouse = false;

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
const ethicsScreen = document.getElementById('ethics-screen');
const consentBtn = document.getElementById('consent-btn');
const demographicsScreen = document.getElementById('demographics-screen');
const questionnaireScreen = document.getElementById('questionnaire-screen');
const instructionsScreen = document.getElementById('instructions-screen');
const experimentScreen = document.getElementById('experiment-screen');
const completionScreen = document.getElementById('completion-screen');
const demographicsForm = document.getElementById('demographics-form');
const questionnaireForm = document.getElementById('questionnaire-form');
const startExperimentBtn = document.getElementById('start-experiment-btn');
const fixationCross = document.getElementById('fixation-cross');
const stimulusImage = document.getElementById('stimulus-image');
const answerButtonContainer = document.getElementById('answer-button-container');
const answerBtn = document.getElementById('answer-btn');
const responseContainer = document.getElementById('response-container');
const responseBtns = document.querySelectorAll('.response-btn');
const currentTrialSpan = document.getElementById('current-trial');
const totalTrialsSpan = document.getElementById('total-trials');

// Initialize
totalTrialsSpan.textContent = totalTrials;

// Mouse tracking functions
function startMouseTracking() {
    mouseTrackingData = [];
    responseStartTime = Date.now();
    isTrackingMouse = true;
}

function stopMouseTracking() {
    isTrackingMouse = false;
}

function trackMousePosition(e) {
    if (!isTrackingMouse) return;
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - responseStartTime;
    
    mouseTrackingData.push({
        x: e.clientX,
        y: e.clientY,
        timestamp: elapsedTime
    });
}

// Add mouse tracking event listener to experiment screen
experimentScreen.addEventListener('mousemove', trackMousePosition);

// Handle consent button click
consentBtn.addEventListener('click', () => {
    switchScreen(demographicsScreen);
});

// Handle answer button click
answerBtn.addEventListener('click', () => {
    // Hide answer button
    answerButtonContainer.classList.add('hidden');
    
    // Show response options and start mouse tracking
    responseContainer.classList.remove('hidden');
    startMouseTracking();
});

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
    
    // SOA list: negative = beep first, positive = image first, 0 = simultaneous
    const soa_list = [300, -100, 100, -125, -10, 75, 125, 250, -75, 50, 200, 10, -250, 30, -200, 150, -50, -30, -300, -150];

    for (let i = 0; i < soa_list.length; i++) {
        const soa = soa_list[i];
        
        // Negative SOA = beep first, positive SOA = image first
        const beepFirst = soa < 0;
        
        // Absolute value is the delay in ms
        const delayMs = Math.abs(soa);
        
        // Has delay if SOA is not 0
        const hadDelay = soa !== 0;

        trials.push({
            trialNumber: i + 1,
            soa: soa,
            delayMs: delayMs,
            hadDelay: hadDelay,
            beepFirst: beepFirst,
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

    // Hide all interactive elements
    responseContainer.classList.add('hidden');
    answerButtonContainer.classList.add('hidden');
    stimulusImage.classList.remove('show');
    fixationCross.classList.add('hidden');

    // Show fixation cross
    fixationCross.classList.remove('hidden');
    await sleep(1000);

    // Hide fixation cross right before stimulus presentation
    fixationCross.classList.add('hidden');

    // Present stimulus immediately after fixation disappears
    stimulusImage.src = trial.imagePath;

    if (trial.beepFirst) {
        // Beep-first trial: play beep immediately, then show image with delay
        playBeep();
        
        // Show image with delay
        setTimeout(() => {
            stimulusImage.classList.add('show');
        }, trial.delayMs);
    } else {
        // Image-first trial: show image immediately, then play beep with delay
        stimulusImage.classList.add('show');
        
        // Play sound with delay
        setTimeout(() => {
            playBeep();
        }, trial.delayMs);
    }

    // Wait for stimulus to finish (image shows for 200ms)
    await sleep(500);

    // Hide image
    stimulusImage.classList.remove('show');

    // Wait a bit before showing answer button
    await sleep(500);

    // Show answer button (no mouse tracking yet)
    answerButtonContainer.classList.remove('hidden');
}

// Handle response
responseBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const userResponse = btn.dataset.response;
        const trial = trials[currentTrial];
        
        // Stop mouse tracking and calculate reaction time
        stopMouseTracking();
        const reactionTimeMs = Date.now() - responseStartTime;
        const finalMouseX = e.clientX;
        const finalMouseY = e.clientY;

        // Calculate correctness - all trials have delays, so "delay" response is correct
        const correct = userResponse === 'delay';

        // Try to save response to backend
        try {
            await fetch(`${API_BASE_URL}/api/response`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    participantId,
                    trialNumber: trial.trialNumber,
                    soa: trial.soa,
                    delayMs: trial.delayMs,
                    hadDelay: trial.hadDelay,
                    beepFirst: trial.beepFirst,
                    userResponse,
                    reactionTimeMs: reactionTimeMs,
                    finalMouseX: finalMouseX,
                    finalMouseY: finalMouseY,
                    mouseTrajectory: mouseTrackingData
                })
            });
        } catch (error) {
            console.warn('Backend not available. Response not saved:', error);
        }

        // Store response locally regardless of save success
        responses.push({
            ...trial,
            userResponse,
            correct,
            reactionTimeMs: reactionTimeMs,
            finalMouseX: finalMouseX,
            finalMouseY: finalMouseY,
            mouseTrajectory: mouseTrackingData.length
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

// Utility functions
function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
