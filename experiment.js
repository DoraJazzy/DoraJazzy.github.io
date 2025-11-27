// State management
let participantId = null;
let currentTrial = 0;
let totalTrials = 20;
let trials = [];
let responses = [];

// Batch data collection
let participantData = null;
let questionnaireData = null;

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

// Function to generate random participant ID
function generateParticipantId() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substring(2, 9);
    return `P-${timestamp}-${randomPart}`;
}

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
    // Hide next button
    answerButtonContainer.classList.add('hidden');
    
    // Move to next trial
    currentTrial++;
    runTrial();
});

// Submit demographics
demographicsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const age = document.getElementById('age').value;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    // Generate unique participant ID
    participantId = generateParticipantId();
    console.log('Generated Participant ID:', participantId);

    // Store participant data locally
    participantData = {
        participantId: participantId,
        age: parseInt(age),
        gender: gender
    };

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

    // Store questionnaire data locally
    questionnaireData = answers;

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

    // Wait a bit before showing response options
    await sleep(500);

    // Show response options and start mouse tracking
    responseContainer.classList.remove('hidden');
    startMouseTracking();
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

        // Store response locally with full mouse tracking data
        responses.push({
            trialNumber: trial.trialNumber,
            soa: trial.soa,
            delayMs: trial.delayMs,
            hadDelay: trial.hadDelay,
            beepFirst: trial.beepFirst,
            userResponse: userResponse,
            correct: correct,
            reactionTimeMs: reactionTimeMs,
            finalMouseX: finalMouseX,
            finalMouseY: finalMouseY,
            mouseTracking: mouseTrackingData.slice() // Store a copy of the array
        });

        // Hide response container and show Next button
        responseContainer.classList.add('hidden');
        answerButtonContainer.classList.remove('hidden');
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

    // Send all data in batch
    sendBatchData();

    switchScreen(completionScreen);
}

// Send all collected data to backend
async function sendBatchData() {
    const batchData = {
        participant: participantData,
        questionnaire: questionnaireData,
        trials: responses
    };

    try {
        await fetch(`${API_BASE_URL}/api/submit-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchData)
        });
        console.log('Data successfully sent to backend');
    } catch (error) {
        console.warn('Backend not available. Data not saved:', error);
        console.log('Local data:', batchData);
    }
}

// Utility functions
function switchScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
