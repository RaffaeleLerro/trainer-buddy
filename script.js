document.addEventListener('DOMContentLoaded', initApp);

// --- Riferimenti DOM ---
const rootContainer = document.getElementById('root-container');
const screens = {
    welcome: document.getElementById('welcome-screen'),
    intermediate: document.getElementById('intermediate-screen'),
    workout: document.getElementById('workout-container'),
    message: document.getElementById('message-container'),
    complete: document.getElementById('complete-screen')
};
// Benvenuto e Scelta Giorno
const welcomeDay = document.getElementById('welcome-day');
const welcomeMuscles = document.getElementById('welcome-muscles');
const welcomeTotalTime = document.getElementById('welcome-total-time');
const startWorkoutButton = document.getElementById('start-workout-button');
const changeDayButton = document.getElementById('change-day-button');
const dayPickerModal = document.getElementById('day-picker-modal');
const closeModalButton = document.getElementById('close-modal-button');
// Intermedia
const interSectionName = document.getElementById('inter-section-name');
const interSectionImage = document.getElementById('inter-section-image');
const interSectionInfo = document.getElementById('inter-section-info');
const startSectionButton = document.getElementById('start-section-button');
// Workout
const dayOfWeekEl = document.getElementById('day-of-week');
const muscleGroupsEl = document.getElementById('muscle-groups');
const sectionTitle = document.getElementById('section-title');
const sectionTimerEl = document.getElementById('section-timer');
const exerciseArea = document.getElementById('exercise-area');
const exerciseNameEl = document.getElementById('exercise-name');
const exerciseGifEl = document.getElementById('exercise-gif');
const progressBar = document.getElementById('progress-bar-inner');
const progressBarTimer = document.getElementById('progress-bar-timer');
const pauseButton = document.getElementById('pause-button');
const nextButton = document.getElementById('next-button');
const messageText = document.getElementById('message-text');
// Schermata Completamento
const completeSummary = document.getElementById('complete-summary');
const homeButton = document.getElementById('home-button');
// Overlay
// const lapIndicator = document.getElementById('lap-indicator'); // Non più usato
// const lapText = document.getElementById('lap-text'); // Non più usato
const pauseOverlay = document.getElementById('pause-overlay');
const resumeButton = document.getElementById('resume-button');
// NUOVO Overlay Giri
const newLapOverlay = document.getElementById('new-lap-overlay');
const newLapText = document.getElementById('new-lap-text');


// --- Stato Applicazione ---
let workoutData = {};
let currentDayWorkout = null;
let currentDayTotalTime = 0;
const sectionKeys = ["Strecching", "Riscaldamento", "Circuito", "Defaticamento"];
const sectionImages = {
    "Strecching": "img/stretching.png",
    "Riscaldamento": "img/riscaldamento.png",
    "Circuito": "img/circuito.png",
    "Defaticamento": "img/defaticamento.png"
};
let currentSectionIndex = 0;
let currentExerciseIndex = 0;
let currentSectionExercises = [];
let currentLap = 1;
let totalLaps = 1;
// Variabili per gestire il circuito di Venerdì
let isVenerdiCircuit = false;
let venerdiCircuitPart = 0;

// --- Timer (nuovo modello basato su timestamp) ---
let timerInterval = null;              // intervallo che aggiorna UI (usiamo timestamp per calcoli)
let exerciseRunningStart = null;       // timestamp in ms quando il run corrente è iniziato
let sectionRunningStart = null;
let exerciseAccum = 0;                 // secondi accumulati prima dell'attuale run
let sectionAccum = 0;

let exerciseTimeElapsed = 0;           // secondi (valore corrente aggiornato)
let sectionTimeElapsed = 0;
let totalExerciseDuration = 0;
let totalSectionTime = 0;
let isPaused = false;

// --- Variabili per gestire la pausa del popup GIRO ---
let lapPopupTimer = null;
let lapPopupStartTime = 0;
let lapPopupRemaining = 1500; // Modificato a 1.5 secondi
let lapPopupCallback = null;
let isLapPopupActive = false;

/**
 * Utility: mostra/nasconde schermate
 */
function showScreen(screenName) {
    Object.keys(screens).forEach(key => {
        if (key === screenName) {
            screens[key].classList.add('is-visible');
            screens[key].classList.remove('hidden');
        } else {
            screens[key].classList.remove('is-visible');
            screens[key].classList.add('hidden');
        }
    });
}

/**
 * Inizializza l'applicazione
 */
async function initApp() {
    startWorkoutButton.addEventListener('click', () => showIntermediateScreen(0));
    startSectionButton.addEventListener('click', startSection);
    pauseButton.addEventListener('click', manualPause);
    resumeButton.addEventListener('click', manualResume);
    nextButton.addEventListener('click', nextExercise);

    homeButton.addEventListener('click', () => {
        currentSectionIndex = 0;
        currentExerciseIndex = 0;
        currentLap = 1;
        stopTimers();
        exerciseAccum = sectionAccum = 0;
        updateDayDisplay(getTodayString());
    });

    changeDayButton.addEventListener('click', () => dayPickerModal.classList.remove('hidden'));
    closeModalButton.addEventListener('click', () => dayPickerModal.classList.add('hidden'));
    dayPickerModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('day-btn')) {
            const selectedDay = e.target.dataset.day;
            updateDayDisplay(selectedDay);
            dayPickerModal.classList.add('hidden');
        }
    });

    // Caricamento Dati
    try {
        showScreen('message');
        messageText.textContent = "Caricamento allenamento...";

        const response = await fetch('prova.json');
        if (!response.ok) throw new Error('Errore di rete o file non trovato');
        workoutData = await response.json();

        const todayString = getTodayString();
        updateDayDisplay(todayString);

    } catch (error) {
        console.error("Errore nel caricamento del JSON:", error);
        showMessage("Impossibile caricare l'allenamento. Riprova più tardi.");
    }
}

/**
 * Aggiorna UI giorno selezionato
 */
function updateDayDisplay(dayString) {
    currentDayWorkout = workoutData[dayString];

    if (currentDayWorkout) {
        const muscleGroups = currentDayWorkout["Gruppo muscolare"];

        currentDayTotalTime = 0;
        sectionKeys.forEach(key => {
            if (currentDayWorkout[key] && currentDayWorkout[key].Tempo) {
                currentDayTotalTime += currentDayWorkout[key].Tempo;
            }
        });

        welcomeDay.textContent = dayString;
        welcomeMuscles.textContent = muscleGroups;
        welcomeTotalTime.textContent = `Tempo totale: ${formatTime(currentDayTotalTime)}`;

        dayOfWeekEl.textContent = dayString;
        muscleGroupsEl.textContent = muscleGroups;

        showScreen('welcome');
        startWorkoutButton.disabled = false;
    } else {
        welcomeDay.textContent = dayString;
        welcomeMuscles.textContent = "Giorno di Riposo";
        welcomeTotalTime.textContent = "";
        dayOfWeekEl.textContent = dayString;
        muscleGroupsEl.textContent = "Giorno di Riposo";
        startWorkoutButton.disabled = true;
        showScreen('welcome');
    }
}

/**
 * Schermata intermedia
 */
function showIntermediateScreen(index) {
    if (index >= sectionKeys.length) {
        showWorkoutComplete();
        return;
    }

    currentSectionIndex = index;
    const sectionName = sectionKeys[index];
    const sectionData = currentDayWorkout[sectionName];

    interSectionName.textContent = sectionName;
    interSectionImage.src = sectionImages[sectionName] || 'img/default.png';

    let infoText = `Tempo totale: ${formatTime(sectionData.Tempo)}.`;
    if (sectionName === "Circuito") {
        infoText += ` ${sectionData.Giri} giri.`
    }
    interSectionInfo.textContent = infoText;

    showScreen('intermediate');
}

/**
 * Gestisce il popup dei giri (pausabile)
 */
function startLapPopupTimer() {
    lapPopupStartTime = Date.now();
    clearTimeout(lapPopupTimer);

    lapPopupTimer = setTimeout(() => {
        // Avvia animazione di chiusura
        newLapOverlay.classList.remove('is-visible');

        // Attendi la fine dell'animazione (400ms CSS) prima di nascondere e ripartire
        setTimeout(() => {
            newLapOverlay.classList.add('hidden');
            isPaused = false;
            isLapPopupActive = false;

            if (lapPopupCallback) {
                const cb = lapPopupCallback;
                lapPopupCallback = null;
                cb(); // tipicamente startTimers
            }
        }, 400); // Durata transizione CSS

    }, lapPopupRemaining);
}

function showLapIndicator(lapNum, callback) {
    // stop timers e imposta stato
    stopTimers();
    isPaused = true;

    // Mostra il nuovo overlay
    newLapText.textContent = `Giro ${lapNum}`;
    newLapOverlay.classList.remove('hidden');
    // Forza reflow per animazione
    void newLapOverlay.offsetWidth;
    newLapOverlay.classList.add('is-visible');

    lapPopupCallback = callback;
    lapPopupRemaining = 1500; // 1.5 secondi
    isLapPopupActive = true;

    startLapPopupTimer();
}

/**
 * Avvia una sezione di allenamento
 */
function startSection() {
    const sectionName = sectionKeys[currentSectionIndex];
    const sectionData = currentDayWorkout[sectionName];

    currentSectionExercises = [];
    currentExerciseIndex = 0;
    isVenerdiCircuit = false;
    venerdiCircuitPart = 0;

    // reset timer di sezione
    sectionAccum = 0;
    sectionTimeElapsed = 0;
    totalSectionTime = sectionData.Tempo;

    if (sectionName === "Circuito") {
        currentLap = 1;
        totalLaps = sectionData.Giri;

        if (dayOfWeekEl.textContent === "Venerdì") {
            isVenerdiCircuit = true;
            venerdiCircuitPart = 0;
            totalLaps = 4;

            const part1Exercises = sectionData.Esercizi.slice(0, 2);
            part1Exercises.forEach(ex => {
                currentSectionExercises.push({ ...ex, isPausa: false });
                const pausaTempo = ex.Pausa || 0;
                if (pausaTempo > 0) {
                    currentSectionExercises.push({
                        Nome: "PAUSA",
                        Gif: "",
                        Tempo: pausaTempo,
                        isPausa: true
                    });
                }
            });

        } else {
            sectionData.Esercizi.forEach(ex => {
                currentSectionExercises.push({ ...ex, isPausa: false });
                const pausaTempo = ex.Pausa || 0;
                if (pausaTempo > 0) {
                    currentSectionExercises.push({
                        Nome: "PAUSA",
                        Gif: "",
                        Tempo: pausaTempo,
                        isPausa: true
                    });
                }
            });
        }

        loadExercise(currentExerciseIndex, () => {
            showLapIndicator(currentLap, startTimers);
        });

    } else {
        currentLap = 1;
        totalLaps = 1;
        currentSectionExercises = sectionData.Esercizi.map(ex => ({ ...ex, isPausa: false }));
        loadExercise(currentExerciseIndex, startTimers);
    }

    updateSectionTitle();
    updateSectionTimerDisplay();

    showScreen('workout');
}

/**
 * Aggiorna titolo sezione (include giri/parte)
 */
function updateSectionTitle() {
    const sectionName = sectionKeys[currentSectionIndex];

    if (sectionName === "Circuito") {
        let title = `${sectionName} (${currentLap}/${totalLaps})`;
        if (isVenerdiCircuit) {
            title += ` (Parte ${venerdiCircuitPart + 1})`;
        }
        sectionTitle.textContent = title;
    } else {
        sectionTitle.textContent = sectionName;
    }
}

/**
 * loadExercise(index, callback) — prepara UI e imposta durate.
 * callback eseguito DOPO transizione/animazione (es. startTimers)
 */
function loadExercise(index, callback) {
    stopTimers();
    exerciseArea.style.opacity = 0;
    pauseButton.textContent = "Pausa";

    setTimeout(() => {
        const exercise = currentSectionExercises[index];

        exerciseNameEl.textContent = exercise.Nome;
        exerciseGifEl.src = exercise.Gif;
        exerciseGifEl.alt = exercise.Nome;

        if (exercise.isPausa) {
            screens.workout.classList.add('is-pause');
        } else {
            screens.workout.classList.remove('is-pause');
        }

        // reset contatore esercizio
        exerciseAccum = 0;
        exerciseTimeElapsed = 0;
        totalExerciseDuration = exercise.Tempo;

        updateProgressBar();

        // Assicura che non rimanga flag di pausa logica prima di avviare i timer
        isPaused = false;

        exerciseArea.style.opacity = 1;

        if (callback) {
            callback();
        }
    }, 200);
}

/**
 * Sincronizza i valori correnti dall'eventuale run attivo (senza modificare accum)
 */
function syncElapsedNow() {
    const now = Date.now();
    if (exerciseRunningStart) {
        exerciseTimeElapsed = exerciseAccum + Math.floor((now - exerciseRunningStart) / 1000);
    } else {
        exerciseTimeElapsed = exerciseAccum;
    }
    if (sectionRunningStart) {
        sectionTimeElapsed = sectionAccum + Math.floor((now - sectionRunningStart) / 1000);
    } else {
        sectionTimeElapsed = sectionAccum;
    }
}

/**
 * startTimers() — avvia l'intervallo che aggiorna UI (calcolo tramite timestamp)
 */
function startTimers() {
    if (isPaused) return; // non partire se siamo in pausa logica (popup/manuale)

    // imposta punti di partenza per il run attuale
    exerciseRunningStart = Date.now();
    sectionRunningStart = Date.now();

    // pulisci eventuale interval precedente
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        syncElapsedNow();

        // aggiorna UI
        updateProgressBar();
        updateSectionTimerDisplay();

        // controllo fine esercizio
        if (exerciseTimeElapsed >= totalExerciseDuration) {
            handleExerciseFinish();
        }
    }, 250); // 250ms per fluidità UI
}

/**
 * stopTimers() — ferma l'intervallo e salva accumulati
 */
function stopTimers() {
    if (!timerInterval && !exerciseRunningStart && !sectionRunningStart) {
        // niente da fare
        return;
    }

    // aggiorna accum con l'eventuale run corrente
    const now = Date.now();
    if (exerciseRunningStart) {
        exerciseAccum = exerciseAccum + Math.floor((now - exerciseRunningStart) / 1000);
    }
    if (sectionRunningStart) {
        sectionAccum = sectionAccum + Math.floor((now - sectionRunningStart) / 1000);
    }

    // porta i display ai valori accumulati
    exerciseTimeElapsed = exerciseAccum;
    sectionTimeElapsed = sectionAccum;

    clearInterval(timerInterval);
    timerInterval = null;
    exerciseRunningStart = null;
    sectionRunningStart = null;
}

/**
 * Pausa manuale (overlay)
 */
function manualPause() {
    if (isPaused) return;
    isPaused = true;
    pauseOverlay.classList.remove('hidden');
    rootContainer.classList.add('is-blurred');
    screens.workout.classList.add('is-manually-paused'); // <-- MODIFICA: Pausa GIF

    // ferma i timer e salva accumulati
    stopTimers();

    if (isLapPopupActive) {
        clearTimeout(lapPopupTimer);
        let timeElapsed = Date.now() - lapPopupStartTime;
        lapPopupRemaining -= timeElapsed;
        if (lapPopupRemaining < 0) lapPopupRemaining = 0;
    }
}

/**
 * Riprendi manuale
 */
function manualResume() {
    pauseOverlay.classList.add('hidden');
    rootContainer.classList.remove('is-blurred');
    screens.workout.classList.remove('is-manually-paused'); // <-- MODIFICA: Riprendi GIF

    if (isLapPopupActive) {
        // riprendi il popup (timer will call callback)
        startLapPopupTimer();
    } else {
        // riprendi i timer dal punto salvato
        isPaused = false;
        startTimers();
    }
}

/**
 * Passaggio all'esercizio successivo
 */
function nextExercise() {
    // sincronizza i valori correnti (anche se il timer è in esecuzione)
    syncElapsedNow();

    // calcola il timeDifference rimanente (clamp >= 0)
    const timeDifference = Math.max(0, totalExerciseDuration - exerciseTimeElapsed);

    // ferma i timer e salva gli accumulati correnti
    stopTimers();

    // aggiungi il tempo rimanente alla sezione (per evitare "secondo perso")
    sectionAccum = sectionAccum + timeDifference;
    sectionTimeElapsed = sectionAccum;

    currentExerciseIndex++;
    const sectionName = sectionKeys[currentSectionIndex];

    if (currentExerciseIndex < currentSectionExercises.length) {
        // esercizio successivo nello stesso giro
        loadExercise(currentExerciseIndex, startTimers);
    }
    else if (currentLap < totalLaps) {
        // giro successivo
        currentLap++;
        currentExerciseIndex = 0;

        updateSectionTitle();

        loadExercise(currentExerciseIndex, () => {
            showLapIndicator(currentLap, startTimers);
        });
    }
    else if (isVenerdiCircuit && venerdiCircuitPart === 0) {
        // fine parte 1 venerdì -> parte 2
        venerdiCircuitPart = 1;
        currentLap = 1;
        totalLaps = 4;
        currentExerciseIndex = 0;
        currentSectionExercises = [];

        const sectionData = currentDayWorkout["Circuito"];
        const part2Exercises = sectionData.Esercizi.slice(2, 4);
        part2Exercises.forEach(ex => {
            currentSectionExercises.push({ ...ex, isPausa: false });
            const pausaTempo = ex.Pausa || 0;
            if (pausaTempo > 0) {
                currentSectionExercises.push({
                    Nome: "PAUSA",
                    Gif: "",
                    Tempo: pausaTempo,
                    isPausa: true
                });
            }
        });

        updateSectionTitle();

        loadExercise(currentExerciseIndex, () => {
            showLapIndicator(currentLap, startTimers);
        });
    }
    else {
        // fine sezione
        isVenerdiCircuit = false;
        updateSectionTimerDisplay();
        showIntermediateScreen(currentSectionIndex + 1);
    }
}

/**
 * Quando l'esercizio finisce naturalmente (timer arriva a durata)
 */
function handleExerciseFinish() {
    // sincronizza e ferma timers (salva accum)
    stopTimers();

    // assicurati che l'esercizio sia segnato come completato
    exerciseTimeElapsed = totalExerciseDuration;
    exerciseAccum = totalExerciseDuration;
    updateProgressBar();

    // sectionAccum è già corretto grazie a stopTimers
    updateSectionTimerDisplay();

    const isCircuit = sectionKeys[currentSectionIndex] === 'Circuito';

    if (isCircuit) {
        setTimeout(nextExercise, 300);
    } else {
        // se non è circuito, mettere in pausa logica (per esempio per riposo)
        isPaused = true;
        pauseButton.textContent = "Pausa";
    }
}

/**
 * Allenamento completato
 */
function showWorkoutComplete() {
    stopTimers();
    completeSummary.textContent = `Hai completato ${sectionKeys.length} sezioni in ${formatTime(currentDayTotalTime)}. Ottimo lavoro! 💪`;
    showScreen('complete');
}

function showMessage(msg) {
    messageText.textContent = msg;
    showScreen('message');
}

// --- Helpers ---

function getTodayString() {
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    return days[new Date().getDay()];
}

function updateProgressBar() {
    const percentage = totalExerciseDuration > 0 ? (exerciseTimeElapsed / totalExerciseDuration) * 100 : 0;
    progressBar.style.width = `${Math.min(percentage, 100)}%`;
    progressBarTimer.textContent = formatTime(Math.min(exerciseTimeElapsed, totalExerciseDuration));
}

function updateSectionTimerDisplay() {
    const displayTime = Math.min(sectionTimeElapsed, totalSectionTime);
    sectionTimerEl.textContent = `${formatTime(displayTime)} / ${formatTime(totalSectionTime)}`;
}

function formatTime(totalSeconds) {
    totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
