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
    muse = new Muse();
    await muse.connect();
    document.getElementById('connect').style.display = 'none';
    document.getElementById('disconnect').style.display = 'inline';
    console.log("Conectado exitosamente.");
    bubble_fn_MuseStatus("connected");
    adjustAmplitudeScale(512);
    updateIntervals.push(setInterval(updateBatteryLevel, 1000));
    updateIntervals.push(setInterval(readEEGData, 8));
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

function toggleYAxisLegend() {
    var showLegend = document.getElementById('showYAxisLegend').value === 'true';
    chart.options.scales.yAxes[0].scaleLabel.display = showLegend;
    chart.options.scales.yAxes[0].ticks.display = showLegend;
    chart.update();
}

function readEEGData() {
    let eegValue = muse.eeg[selectedElectrodeIndex].read(); // Usa el índice seleccionado
    if (eegValue !== null) {
        let filteredValue = filtersEnabled ? lpFilter.filter(eegValue) : eegValue;
        filteredValue = Math.max(filteredValue, -400);
        document.getElementById("eegFP1").innerText = "Electrode " + selectedElectrodeIndex + ": " + Math.abs(filteredValue).toFixed(2) + " uVrms";
        processEEGData(Math.abs(filteredValue));
        updateGraph(filteredValue);
        addToRecording(Math.abs(filteredValue));
    }
}

function adjustAmplitudeScale(newScale) {
    amplitudeScale = 500 / newScale;
    document.getElementById('scaleValue').innerText = `${newScale.toFixed(1)}x`;
    updateGraph(0);
}

var ctx = document.getElementById('eegGraph').getContext('2d');
var timeStamps = [...Array(1000).keys()].map(x => -8000 + x * 50);
var voltages = new Array(1000).fill(0);

var chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: timeStamps,
        datasets: [{
            label: '',
            data: voltages,
            borderColor: '#8F5A7A',
            tension: 0.1,
            pointRadius: 0,
            borderWidth: 1
        }]
    },
    options: {
        elements: {
            point: {
                radius: 0
            }
        },
        tooltips: {
            enabled: false
        },
        scales: {
            yAxes: [{
                ticks: {
                    min: -400,
                    max: 400,
                    stepSize: 100
                },
                gridLines: {
                    display: false
                }
            }],
            xAxes: [{
                gridLines: {
                    display: false
                },
                ticks: {
                    display: false
                }
            }]
        },
        hover: {
            mode: null
        },
        responsive: true,
        maintainAspectRatio: false
    }
});

function updateGraph(newVoltage) {
    var scaledVoltage = Math.abs(newVoltage * amplitudeScale);
    scaledVoltage = Math.max(Math.min(scaledVoltage, 400), 0);
    voltages.shift();
    voltages.push(scaledVoltage);
    chart.update();
    let message = scaledVoltage > 100 ? "Valor fuera de rango normal" : "";
    document.getElementById("warningMessage").innerText = message;
}

document.getElementById('amplitudeScale').addEventListener('input', function() {
    adjustAmplitudeScale(this.valueAsNumber);
});

function toggleYAxisDisplay(show) {
    chart.options.scales.yAxes.forEach(axis => {
        axis.ticks.display = show;
        axis.scaleLabel.display = show;
    });
    chart.update();
}

window.toggleYAxisDisplay = toggleYAxisDisplay;

document.getElementById('connect').addEventListener('click', connectAndReadData);
document.getElementById('disconnect').addEventListener('click', disconnect);
document.getElementById('enableFilters').addEventListener('change', toggleFilters);
document.getElementById('showYAxisLegend').addEventListener('change', toggleYAxisLegend);

