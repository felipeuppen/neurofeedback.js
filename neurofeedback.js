// neurofeedback.js

class FFT {
    constructor(size) {
        this.size = size;
        this.table = new Float32Array(size);
        this.reverseTable = new Uint32Array(size);
        this.im = new Float32Array(size);
        this.re = new Float32Array(size);

        for (let i = 0; i < size; i++) {
            this.reverseTable[i] = this.reverseBits(i, Math.log2(size));
        }

        for (let i = 0; i < size / 2; i++) {
            this.table[i] = -2 * Math.PI * i / size;
        }
    }

    reverseBits(x, bits) {
        let y = 0;
        for (let i = 0; i < bits; i++) {
            y = (y << 1) | (x & 1);
            x >>= 1;
        }
        return y;
    }

    transform(re, im) {
        const size = this.size;
        const table = this.table;
        const reverseTable = this.reverseTable;

        for (let i = 0; i < size; i++) {
            this.re[reverseTable[i]] = re[i];
            this.im[reverseTable[i]] = im[i];
        }

        for (let halfSize = 1; halfSize < size; halfSize <<= 1) {
            const phaseShiftStepReal = Math.cos(table[halfSize]);
            const phaseShiftStepImag = Math.sin(table[halfSize]);

            for (let fftStep = 0; fftStep < size; fftStep += 2 * halfSize) {
                let currentPhaseShiftReal = 1.0;
                let currentPhaseShiftImag = 0.0;

                for (let fftStep2 = 0; fftStep2 < halfSize; fftStep2++) {
                    const off = fftStep + fftStep2;
                    const tr = currentPhaseShiftReal * this.re[off + halfSize] - currentPhaseShiftImag * this.im[off + halfSize];
                    const ti = currentPhaseShiftReal * this.im[off + halfSize] + currentPhaseShiftImag * this.re[off + halfSize];

                    this.re[off + halfSize] = this.re[off] - tr;
                    this.im[off + halfSize] = this.im[off] - ti;
                    this.re[off] += tr;
                    this.im[off] += ti;

                    const tmpReal = currentPhaseShiftReal;
                    currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
                    currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
                }
            }
        }

        for (let i = 0; i < size; i++) {
            re[i] = this.re[i];
            im[i] = this.im[i];
        }
    }

    createComplexArray() {
        return new Float32Array(this.size * 2);
    }

    toComplexArray(input) {
        const complexArray = new Float32Array(this.size * 2);
        for (let i = 0; i < input.length; i++) {
            complexArray[2 * i] = input[i];
            complexArray[2 * i + 1] = 0;
        }
        return complexArray;
    }

    completeSpectrum(complexArray) {
        const size = this.size;
        for (let i = 0; i < size / 2; i++) {
            complexArray[2 * (size - i - 1)] = complexArray[2 * i];
            complexArray[2 * (size - i - 1) + 1] = -complexArray[2 * i + 1];
        }
    }
}

const FFT_SIZE = 64;
let eegBuffer = [];
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
    if (eegBuffer.length >= FFT_SIZE) {
        console.log("Buffer lleno, calculando FFT...");
        const fft = new FFT(FFT_SIZE);
        const out = fft.createComplexArray();
        const data = fft.toComplexArray(eegBuffer);
        fft.transform(out, data);
        fft.completeSpectrum(out);
        const frequencies = out.slice(0, FFT_SIZE / 2).map((v, i) => Math.sqrt(out[2 * i] ** 2 + out[2 * i + 1] ** 2));
        console.log("Frequencies calculated:", frequencies);
        updateNeurofeedback(frequencies);
        eegBuffer = eegBuffer.slice(-FFT_SIZE / 2); // Desplazar la ventana a la mitad para una actualización continua
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
