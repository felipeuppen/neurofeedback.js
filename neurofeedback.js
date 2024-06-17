class FFT {
    constructor(size, sampleRate) {
        this.size = size;
        this.sampleRate = sampleRate;
        this.real = new Array(size).fill(0);
        this.imag = new Array(size).fill(0);
    }

    forward(buffer) {
        this.real = buffer.slice();
        this.imag.fill(0);

        const N = this.size;
        const halfN = N / 2;
        let real, imag, tpreal, tpimag, costp, sintp;
        let cos = Math.cos, sin = Math.sin, PI = Math.PI;

        for (let i = 0; i < N; i++) {
            let j = 0;
            for (let bit = 0; bit < Math.log2(N); bit++) {
                j = (j << 1) | (1 & (i >> bit));
            }
            if (j > i) {
                [this.real[i], this.real[j]] = [this.real[j], this.real[i]];
                [this.imag[i], this.imag[j]] = [this.imag[j], this.imag[i]];
            }
        }

        for (let i = 1; i < N; i <<= 1) {
            costp = cos(PI / i);
            sintp = sin(PI / i);

            for (let j = 0; j < N; j += (i << 1)) {
                real = 1;
                imag = 0;

                for (let k = 0; k < i; k++) {
                    tpreal = real * this.real[j + k + i] - imag * this.imag[j + k + i];
                    tpimag = real * this.imag[j + k + i] + imag * this.real[j + k + i];

                    this.real[j + k + i] = this.real[j + k] - tpreal;
                    this.imag[j + k + i] = this.imag[j + k] - tpimag;

                    this.real[j + k] += tpreal;
                    this.imag[j + k] += tpimag;

                    tpreal = real * costp - imag * sintp;
                    imag = real * sintp + imag * costp;
                    real = tpreal;
                }
            }
        }
    }

    get spectrum() {
        const spectrum = new Array(this.size / 2);
        for (let i = 0; i < this.size / 2; i++) {
            spectrum[i] = Math.sqrt(this.real[i] ** 2 + this.imag[i] ** 2);
        }
        return spectrum;
    }
}

const FFT_SIZE = 128;
let eegBuffer = [];
let frequencyBuffer = [];
const FREQUENCY_BUFFER_SIZE = 25; // Adjust based on how many updates you want to keep
let audioElement = document.getElementById("neurofeedbackAudio");
audioElement.loop = true;
let fadeInInterval, fadeOutInterval;
let frequencyChart;
let relaxedSeconds = 0, attentiveSeconds = 0, neutralSeconds = 0;

var neurofeedbackProtocol = 'relaxation';

function setRelaxationProtocol() {
    neurofeedbackProtocol = 'relaxation';
    console.log('Protocolo de relajación activado.');
}

function setAttentionProtocol() {
    neurofeedbackProtocol = 'attention';
    console.log('Protocolo de atención activado.');
}

class MovingAverage {
    constructor(size) {
        this.size = size;
        this.buffer = new Array(size).fill(0);
    }

    filter(value) {
        this.buffer.shift();
        this.buffer.push(value);
        return this.buffer.reduce((acc, val) => acc + val, 0) / this.size;
    }
}

class HighPassFilter {
    constructor(sampleRate, cutoffFrequency) {
        this.sampleRate = sampleRate;
        this.cutoffFrequency = cutoffFrequency;
        this.alpha = this.calculateAlpha(cutoffFrequency, sampleRate);
        this.prevX = 0;
        this.prevY = 0;
    }

    calculateAlpha(cutoffFrequency, sampleRate) {
        const RC = 1.0 / (cutoffFrequency * 2 * Math.PI);
        const dt = 1.0 / sampleRate;
        return dt / (RC + dt);
    }

    filter(x) {
        const y = this.alpha * (x - this.prevX) + (1 - this.alpha) * this.prevY;
        this.prevX = x;
        this.prevY = y;
        return y;
    }
}

class LowPassFilter {
    constructor(sampleRate, cutoffFrequency) {
        this.sampleRate = sampleRate;
        this.cutoffFrequency = cutoffFrequency;
        this.alpha = this.calculateAlpha(cutoffFrequency, sampleRate);
        this.prevY = 0;
    }

    calculateAlpha(cutoffFrequency, sampleRate) {
        const RC = 1.0 / (cutoffFrequency * 2 * Math.PI);
        const dt = 1.0 / sampleRate;
        return dt / (RC + dt);
    }

    filter(x) {
        const y = (1 - this.alpha) * x + this.alpha * this.prevY;
        this.prevY = y;
        return y;
    }
}

function sumPower(data, startFreq, endFreq) {
    const startIndex = Math.floor(startFreq / (256 / FFT_SIZE));
    const endIndex = Math.floor(endFreq / (256 / FFT_SIZE));
    console.log(`Sumando potencia para frecuencias entre ${startFreq} y ${endFreq}, índices ${startIndex} a ${endIndex}`);
    return data.slice(startIndex, endIndex + 1).reduce((acc, val) => acc + val, 0);
}

window.processEEGData = function (uVrms) {
    console.log("processEEGData called with:", uVrms);
    eegBuffer.push(uVrms);
    console.log("eegBuffer length:", eegBuffer.length);
    if (eegBuffer.length === FFT_SIZE) {
        console.log("Buffer lleno, calculando FFT...");
        const fft = new FFT(FFT_SIZE, 256);
        fft.forward(eegBuffer);
        const frequencies = fft.spectrum;
        console.log("Frequencies calculated:", frequencies);

        // Asegurarse de que las frecuencias no estén vacías
        if (frequencies && frequencies.length > 0) {
            frequencyBuffer.push(frequencies);
            if (frequencyBuffer.length > FREQUENCY_BUFFER_SIZE) {
                frequencyBuffer.shift();
            }
            updateNeurofeedback(frequencies);
        } else {
            console.error("FFT calculation returned an empty spectrum.");
        }

        eegBuffer = [];
    }
};

function updateNeurofeedback(frequencies) {
    if (!frequencyChart) {
        console.error("El gráfico de frecuencias no ha sido inicializado.");
        return;
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

    console.log("Power Data:", powerData);

    frequencyChart.data.datasets[0].data = powerData;
    frequencyChart.update();

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
    audioElement.play();
}

window.processEEGData = processEEGData;
window.updateNeurofeedback = updateNeurofeedback;
window.fadeInAudio = fadeInAudio;
window.fadeOutAudio = fadeOutAudio;
window.enableAudioFeedback = enableAudioFeedback;
window.setRelaxationProtocol = setRelaxationProtocol;
window.setAttentionProtocol = setAttentionProtocol;

document.addEventListener('DOMContentLoaded', function () {
    console.log("neurofeedback.js loaded and functions are defined.");
});
