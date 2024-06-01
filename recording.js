let isRecording = false;
let recordedData = [];
let sessionStartTime;
let sessionDuration = 0; // Duración de la sesión en segundos

// Iniciar la grabación
function startRecording() {
    if (isRecording) {
        console.error("La grabación ya está activa.");
        return;
    }
    recordedData = [];
    isRecording = true;
    sessionStartTime = Date.now();
    attentiveSeconds = 0; // Reiniciar el contador de tiempo de atención
    neutralSeconds = 0;  // Reiniciar el contador de tiempo neutral
    relaxedSeconds = 0;  // Reiniciar el contador de tiempo relajado
    console.log("Grabación iniciada.");
}

// Agregar datos al registro
function addToRecording(value) {
    if (isRecording) {
        const timestamp = new Date().toISOString();
        recordedData.push({
            time: timestamp,
            value: value
        });
    }
}

// Detener la grabación
function stopRecording() {
    if (!isRecording) {
        console.error("No hay una grabación activa.");
        return;
    }
    isRecording = false;
    sessionDuration = (Date.now() - sessionStartTime) / 1000; // Calcula la duración de la sesión en segundos
    console.log("Grabación detenida.");
    console.log("Tiempo Relajado: " + relaxedSeconds + " segundos");
    console.log("Tiempo de Atención: " + attentiveSeconds + " segundos");
    console.log("Tiempo Neutral: " + neutralSeconds + " segundos");
    processRecordedData();  // Procesar los datos grabados para enviarlos
}

// Procesar los datos grabados para enviarlos a través de un elemento de JavaScript to Bubble
function processRecordedData() {
    // Aquí se usa '@' como delimitador para separar cada línea de datos
    let recordingAsString = recordedData.map(e => `${e.time},${e.value}`).join("@");
    // Ahora 'recordingAsString' contiene todas las líneas de datos separadas por '@'
    bubble_fn_js_to_bubble(recordingAsString);  // Envía la cadena formateada
}

window.startRecording = startRecording;
window.stopRecording = stopRecording;

