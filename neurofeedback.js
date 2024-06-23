class FFT {
    constructor(bufferSize, sampleRate) {
        this.bufferSize = bufferSize;
        this.sampleRate = sampleRate;
        this.spectrum = new Float32Array(bufferSize / 2);
        this.real = new Float32Array(bufferSize);
        this.imag = new Float32Array(bufferSize);
        this.reverseTable = new Uint32Array(bufferSize);
        this.sinTable = new Float32Array(bufferSize);
        this.cosTable = new Float32Array(bufferSize);

        let limit = 1;
        let bit = bufferSize >> 1;

        while (limit < bufferSize) {
            for (let i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit = limit << 1;
            bit = bit >> 1;
        }

        for (let i = 0; i < bufferSize; i++) {
            this.sinTable[i] = Math.sin(-Math.PI / i);
            this.cosTable[i] = Math.cos(-Math.PI / i);
        }
    }

    forward(buffer) {
        let real = this.real;
        let imag = this.imag;
        let reverseTable = this.reverseTable;
        let sinTable = this.sinTable;
        let cosTable = this.cosTable;
        let spectrum = this.spectrum;
        let bufferSize = this.bufferSize;

        if (buffer.length !== bufferSize) {
            throw new Error('Supplied buffer is not the same size as defined FFT. FFT Size: ' + bufferSize + ' Buffer Size: ' + buffer.length);
        }

        for (let i = 0; i < bufferSize; i++) {
            real[i] = buffer[reverseTable[i]];
            imag[i] = 0;
        }

        let halfSize = 1;

        while (halfSize < bufferSize) {
            let phaseShiftStepReal = cosTable[halfSize];
            let phaseShiftStepImag = sinTable[halfSize];
            let currentPhaseShiftReal = 1.0;
            let currentPhaseShiftImag = 0.0;

            for (let fftStep = 0; fftStep < halfSize; fftStep++) {
                let i = fftStep;

                while (i < bufferSize) {
                    let off = i + halfSize;
                    let tr = (currentPhaseShiftReal * real[off]) - (currentPhaseShiftImag * imag[off]);
                    let ti = (currentPhaseShiftReal * imag[off]) + (currentPhaseShiftImag * real[off]);

                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;

                    i += halfSize << 1;
                }

                let tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = (tmpReal * phaseShiftStepReal) - (currentPhaseShiftImag * phaseShiftStepImag);
                currentPhaseShiftImag = (tmpReal * phaseShiftStepImag) + (currentPhaseShiftImag * phaseShiftStepReal);
            }

            halfSize = halfSize << 1;
        }

        for (let i = 0; i < bufferSize / 2; i++) {
            spectrum[i] = 2 * Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / bufferSize;
        }
    }
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

function updateNeurofeedback(frequencies) {
    if (!frequencyChart) {
        console.error("El gráfico de frecuencias no ha sido inicializado.");
        return;
    }
    const totalPower = frequencies.reduce((a, b) => a + b, 0);
    console.log("Potencia total:", totalPower);
    const deltaPower = sumPower(frequencies, 0.5, 4) / totalPower;
    const thetaPower = sumPower(frequencies, 4, 8) / totalPower;
    const alphaPower = sumPower(frequencies, 8, 14) / totalPower;
    const betaPower = sumPower(frequencies, 14, 30) / totalPower;
    const gammaPower = sumPower(frequencies, 30, 50) / totalPower;
    console.log("Potencias calculadas - Delta:", deltaPower, "Theta:", thetaPower, "Alpha:", alphaPower, "Beta:", betaPower, "Gamma:", gammaPower);
    const powerData = [deltaPower * 100, thetaPower * 100, alphaPower * 100, betaPower * 100, gammaPower * 100];
    console.log("Power Data:", powerData);
    frequencyChart.data.datasets[0].data = powerData;
    console.log("Datos actualizados en el gráfico de frecuencias:", frequencyChart.data.datasets[0].data);
    frequencyChart.update();

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
}

var selectedElectrodeIndex = 2;
var amplitudeScale = 512;
var muse;
var updateIntervals = [];
var lpFilter = new LowPassFilter(256, 50);
var filtersEnabled = true;

async function connectAndReadData() {
    console.log("connectAndReadData function called.");
    try {
        muse = new Muse();
        await muse.connect();
        console.log("Conectado exitosamente.");
        bubble_fn_MuseStatus("connected");
        adjustAmplitudeScale(512);
        updateIntervals.push(setInterval(updateBatteryLevel, 1000));
        updateIntervals.push(setInterval(readEEGData, 100));
    } catch (error) {
        console.error("Error in connectAndReadData:", error);
    }
}

function disconnect() {
    if (muse) {
        muse.disconnect();
        console.log("Desconectado exitosamente.");
        bubble_fn_MuseStatus("disconnected");
        updateIntervals.forEach(clearInterval);
        updateIntervals = [];
    }
}

function updateBatteryLevel() {
    if (muse && muse.batteryLevel != null) {
        bubble_fn_MuseBattery(muse.batteryLevel.toFixed(2));
    }
}

function toggleFilters() {
    filtersEnabled = document.getElementById('enableFilters').checked;
}

function readEEGData() {
    try {
        let eegValue = muse.eeg[selectedElectrodeIndex].read();
        if (eegValue !== null) {
            let filteredValue = filtersEnabled ? lpFilter.filter(eegValue) : eegValue;
            filteredValue = Math.max(filteredValue, -400);
            processEEGData(Math.abs(filteredValue));
            addToRecording(Math.abs(filteredValue));
            bubble_fn_uvrms(filteredValue);
            bubble_fn_voltage(filteredValue);
            updateVoltageGraph(filteredValue);
        }
    } catch (error) {
        console.error("Error in readEEGData:", error);
    }
}

function adjustAmplitudeScale(newScale) {
    amplitudeScale = 500 / newScale;
    document.getElementById('scaleValue').innerText = `${newScale.toFixed(1)}x`;
    bubble_fn_amplitudeScale(newScale);
}

function processEEGData(uVrms) {
    console.log("processEEGData called with:", uVrms);
    eegBuffer.push(uVrms);
    console.log("eegBuffer length:", eegBuffer.length);
    if (eegBuffer.length >= FFT_SIZE) {
        console.log("Buffer lleno, calculando FFT...");
        const fft = new FFT(FFT_SIZE, 256);
        fft.forward(eegBuffer);
        const frequencies = fft.spectrum;
        console.log("Frequencies calculated:", frequencies);
        if (frequencies && frequencies.length > 0) {
            updateNeurofeedback(frequencies);
        } else {
            console.error("FFT calculation returned an empty spectrum.");
        }
        eegBuffer = eegBuffer.slice(-FFT_SIZE / 2);
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

function setRelaxationProtocol() {
    neurofeedbackProtocol = 'relaxation';
    console.log('Protocolo de relajación activado.');
}

function setAttentionProtocol() {
    neurofeedbackProtocol = 'attention';
    console.log('Protocolo de atención activado.');
}

function changeAudioSource(source) {
    audioElement.src = source;
    audioElement.load();
    console.log('Fuente de audio cambiada a:', source);
}

function stopNeurofeedback() {
    fadeOutAudio();
    console.log('Neurofeedback detenido.');
}

// Incorporando funciones de grabación
let isRecording = false;
let recordedData = [];
let sessionStartTime;
let sessionDuration = 0;

function startRecording() {
    if (isRecording) {
        console.error("La grabación ya está activa.");
        return;
    }
    recordedData = [];
    isRecording = true;
    sessionStartTime = Date.now();
    attentiveSeconds = 0;
    neutralSeconds = 0;
    relaxedSeconds = 0;
    console.log("Grabación iniciada.");
}

function addToRecording(value) {
    if (isRecording) {
        const timestamp = new Date().toISOString();
        recordedData.push({
            time: timestamp,
            value: value
        });
    }
}

function stopRecording() {
    if (!isRecording) {
        console.error("No hay una grabación activa.");
        return;
    }
    isRecording = false;
    sessionDuration = (Date.now() - sessionStartTime) / 1000;
    console.log("Grabación detenida.");
    processRecordedData();
}

function processRecordedData() {
    let recordingAsString = recordedData.map(e => `${e.time},${e.value}`).join("@");
    bubble_fn_js_to_bubble(recordingAsString);
}

function showVoltageGraph() {
    document.getElementById('voltageGraphContainer').style.display = 'block';
    document.getElementById('frequencyGraphContainer').style.display = 'none';
}

function showFrequencyGraph() {
    document.getElementById('voltageGraphContainer').style.display = 'none';
    document.getElementById('frequencyGraphContainer').style.display = 'block';
}

// Exportar las funciones que necesitas usar en el HTML
window.connectAndReadData = connectAndReadData;
window.disconnect = disconnect;
window.toggleFilters = toggleFilters;
window.readEEGData = readEEGData;
window.adjustAmplitudeScale = adjustAmplitudeScale;
window.processEEGData = processEEGData;
window.fadeInAudio = fadeInAudio;
window.fadeOutAudio = fadeOutAudio;
window.enableAudioFeedback = enableAudioFeedback;
window.setRelaxationProtocol = setRelaxationProtocol;
window.setAttentionProtocol = setAttentionProtocol;
window.changeAudioSource = changeAudioSource;
window.stopNeurofeedback = stopNeurofeedback;
window.startRecording = startRecording;
window.stopRecording = stopRecording;
window.showVoltageGraph = showVoltageGraph;
window.showFrequencyGraph = showFrequencyGraph;
