// neurofeedback.js

// Configuración inicial
let eegBuffer = [];
const FFT_SIZE = 256;
let audioElement = document.getElementById("neurofeedbackAudio");
audioElement.loop = true;
let fadeInInterval, fadeOutInterval; // Intervalos para control de audio
let frequencyChart; // Variable para manejar el gráfico de frecuencia
let relaxedSeconds = 0, attentiveSeconds = 0, neutralSeconds = 0;

var neurofeedbackProtocol = 'relaxation'; // Valor predeterminado

function setRelaxationProtocol() {
    neurofeedbackProtocol = 'relaxation';
    console.log('Protocolo de relajación activado.');
}

function setAttentionProtocol() {
    neurofeedbackProtocol = 'attention';
    console.log('Protocolo de atención activado.');
}

// Función para calcular la potencia en un rango de frecuencias
function sumPower(data, startFreq, endFreq) {
    const startIndex = Math.floor(startFreq / (256 / FFT_SIZE));
    const endIndex = Math.floor(endFreq / (256 / FFT_SIZE));
    return data.slice(startIndex, endIndex + 1).reduce((acc, val) => acc + val, 0);
}

// Función para procesar datos de EEG, realizar FFT y actualizar feedback
function processEEGData(uVrms) {
    eegBuffer.push(uVrms);
    if (eegBuffer.length === FFT_SIZE) {
        const fft = new FFT(FFT_SIZE, 256);
        fft.forward(eegBuffer);
        const frequencies = fft.spectrum;
        updateNeurofeedback(frequencies);
        eegBuffer = []; // Reiniciar el buffer después de calcular FFT
    }
}

// Función de Neurofeedback basada en la potencia de las bandas de frecuencia
function updateNeurofeedback(frequencies) {
    if (!frequencyChart) {
        console.error("El gráfico de frecuencias no ha sido inicializado.");
        return; // No continuar si el gráfico no está disponible
    }

    const totalPower = frequencies.reduce((a, b) => a + b, 0);
    const deltaPower = sumPower(frequencies, 0.5, 4) / totalPower;
    const thetaPower = sumPower(frequencies, 4, 8) / totalPower;
    const alphaPower = sumPower(frequencies, 8, 14) / totalPower;
    const betaPower = sumPower(frequencies, 14, 30) / totalPower;
    const gammaPower = sumPower(frequencies, 30, 50) / totalPower;

    const relaxation = thetaPower + alphaPower;
    const focus = betaPower + gammaPower;

    switch (neurofeedbackProtocol) {
        case 'relaxation':
            if (relaxation > focus) {
                fadeInAudio();
            } else {
                fadeOutAudio();
            }
            break;
        case 'attention':
            if (focus > relaxation) {
                fadeInAudio();
            } else {
                fadeOutAudio();
            }
            break;
        default:
            console.log('No se reconoce el protocolo de neurofeedback.');
            break;
    }

    const powerData = [
        deltaPower * 100,
        thetaPower * 100,
        alphaPower * 100,
        betaPower * 100,
        gammaPower * 100
    ];

    frequencyChart.data.datasets[0].data = powerData;
    frequencyChart.update();

    // Condiciones para actualizar cada tipo de segundos basados en potencias de banda
    if ((deltaPower + thetaPower + alphaPower) > (betaPower + gammaPower)) {
        fadeInAudio();
        relaxedSeconds++;
        document.getElementById('relaxedTime').textContent = relaxedSeconds.toString();
        bubble_fn_relaxedSeconds(relaxedSeconds);
    } else if ((betaPower + gammaPower) > (deltaPower + thetaPower + alphaPower)) {
        fadeInAudio();
        attentiveSeconds++;
        document.getElementById('attentiveTime').textContent = attentiveSeconds.toString();
        bubble_fn_attentiveSeconds(attentiveSeconds);
    } else if ((alphaPower + thetaPower) > (deltaPower + betaPower + gammaPower)) {
        fadeInAudio();
        neutralSeconds++;
        document.getElementById('neutralTime').textContent = neutralSeconds.toString();
        bubble_fn_neutralSeconds(neutralSeconds);
    } else {
        fadeOutAudio();
    }
}

// Funciones para manejar la reproducción y el volumen del audio
function fadeInAudio() {
    clearInterval(fadeOutInterval);
    if (audioElement.volume < 1) {
        fadeInInterval = setInterval(() => {
            audioElement.volume = Math.min(1, audioElement.volume + 0.05);
            if (audioElement.volume >= 1) {
                clearInterval(fadeInInterval);
            }
        }, 200);
    }
}

function fadeOutAudio() {
    clearInterval(fadeInInterval);
    if (audioElement.volume > 0) {
        fadeOutInterval = setInterval(() => {
            audioElement.volume = Math.max(0, audioElement.volume - 0.05);
            if (audioElement.volume <= 0) {
                clearInterval(fadeOutInterval);
            }
        }, 200);
    }
}

function enableAudioFeedback() {
    console.log("Feedback de audio activado.");
    audioElement.play(); // Asegúrate de que el audio está listo para reproducirse
}
