console.log("main.js has been loaded.");

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

var selectedElectrodeIndex = 2; // Electrodo FP2 como predeterminado

function selectElectrodeFP1() {
    setSelectedElectrode(1);
}

function selectElectrodeFP2() {
    setSelectedElectrode(2);
}

function selectElectrodeTP9() {
    setSelectedElectrode(0);
}

function selectElectrodeTP10() {
    setSelectedElectrode(3);
}

function setSelectedElectrode(index) {
    selectedElectrodeIndex = index;
    console.log("Electrode seleccionado cambiado a: " + index);
}

var amplitudeScale = 512; // Escala de amplitud inicial

var muse;
var updateIntervals = [];
var lpFilter = new LowPassFilter(256, 50);
var filtersEnabled = true;

async function connectAndReadData() {
    console.log("connectAndReadData function called.");
    try {
        muse = new Muse();
        await muse.connect();
        document.getElementById('connect').style.display = 'none';
        document.getElementById('disconnect').style.display = 'inline';
        console.log("Conectado exitosamente.");
        bubble_fn_MuseStatus("connected");
        adjustAmplitudeScale(512);
        updateIntervals.push(setInterval(updateBatteryLevel, 1000));
        updateIntervals.push(setInterval(readEEGData, 8));
    } catch (error) {
        console.error("Error in connectAndReadData:", error);
    }
}

function disconnect() {
    if (muse) {
        muse.disconnect();
        console.log("Desconectado exitosamente.");
        document.getElementById('disconnect').style.display = 'none';
        document.getElementById('connect').style.display = 'inline';
        bubble_fn_MuseStatus("disconnected");
        updateIntervals.forEach(clearInterval);
        updateIntervals = [];
    }
}

function updateBatteryLevel() {
    if (muse && muse.batteryLevel != null) {
        document.getElementById("batteryLevel").innerText = "Nivel de batería: " + muse.batteryLevel.toFixed(2) + "%";
        bubble_fn_MuseBattery(muse.batteryLevel.toFixed(2));
    }
}

function toggleFilters() {
    filtersEnabled = document.getElementById('enableFilters').checked;
}

function readEEGData() {
    try {
        let eegValue = muse.eeg[selectedElectrodeIndex].read(); // Usa el índice seleccionado
        if (eegValue !== null) {
            let filteredValue = filtersEnabled ? lpFilter.filter(eegValue) : eegValue;
            filteredValue = Math.max(filteredValue, -400);
            document.getElementById("eegFP1").innerText = "Electrode " + selectedElectrodeIndex + ": " + Math.abs(filteredValue).toFixed(2) + " uVrms";
            processEEGData(Math.abs(filteredValue));
            addToRecording(Math.abs(filteredValue));

            // Update the voltage graph if the function is available
            if (window.updateVoltageGraph) {
                window.updateVoltageGraph(Math.abs(filteredValue));
            }
        }
    } catch (error) {
        console.error("Error in readEEGData:", error);
    }
}

function adjustAmplitudeScale(newScale) {
    amplitudeScale = 500 / newScale;
    document.getElementById('scaleValue').innerText = `${newScale.toFixed(1)}x`;
}

document.getElementById('amplitudeScale').addEventListener('input', function() {
    adjustAmplitudeScale(this.valueAsNumber);
});

// Register functions globally
window.connectAndReadData = connectAndReadData;
window.disconnect = disconnect;
window.toggleFilters = toggleFilters;
window.readEEGData = readEEGData;
window.adjustAmplitudeScale = adjustAmplitudeScale;

console.log("All functions have been registered globally.");
