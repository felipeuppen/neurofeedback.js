# Neurofeedback.js

**Neurofeedback.js** es una librería JavaScript diseñada para realizar procesamiento de señales EEG y proporcionar feedback en tiempo real utilizando dispositivos Muse. Esta librería permite la conexión y lectura de datos EEG desde un dispositivo Muse, el procesamiento de estos datos para obtener información sobre diferentes bandas de frecuencia, y la provisión de feedback auditivo basado en protocolos específicos de neurofeedback.

## Características

- **Conexión con dispositivos Muse:** Conecta y lee datos EEG en tiempo real.
- **Procesamiento FFT:** Realiza transformadas rápidas de Fourier (FFT) para analizar las bandas de frecuencia de las señales EEG.
- **Filtros de señal:** Incluye filtros de paso alto y paso bajo para el procesamiento de señales.
- **Protocolo de Neurofeedback:** Proporciona feedback auditivo basado en protocolos de relajación y atención.
- **Grabación de datos:** Permite la grabación de sesiones EEG para análisis posterior.

## Requisitos

Para utilizar **Neurofeedback.js**, necesitas incluir también **Muse.js** en tu proyecto. **Muse.js** se encarga de la conexión y la lectura de datos desde el dispositivo Muse.

// Conectar al dispositivo Muse y comenzar a leer datos
connectAndReadData();

// Desconectar del dispositivo Muse
disconnect();

// Ajustar la escala de amplitud para el procesamiento de señales
adjustAmplitudeScale(newScale);

// Iniciar grabación
startRecording();

// Detener grabación
stopRecording();

// Activar feedback auditivo
enableAudioFeedback();

// Cambiar el protocolo a relajación
setRelaxationProtocol();

// Cambiar el protocolo a atención
setAttentionProtocol();

