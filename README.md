# Neurofeedback.js

**Neurofeedback.js** es una librería JavaScript diseñada para realizar procesamiento de señales EEG y proporcionar feedback en tiempo real utilizando dispositivos Muse 2. Esta librería permite la conexión y lectura de datos EEG desde un dispositivo Muse 2, el procesamiento de estos datos para obtener información sobre diferentes bandas de frecuencia, y la provisión de feedback auditivo basado en protocolos específicos de neurofeedback.

## Características

- **Conexión con dispositivos Muse:** Conecta y lee datos EEG en tiempo real.
- **Procesamiento FFT:** Realiza transformadas rápidas de Fourier (FFT) para analizar las bandas de frecuencia de las señales EEG.
- **Filtros de señal:** Incluye filtros de paso alto y paso bajo para el procesamiento de señales.
- **Protocolo de Neurofeedback:** Proporciona feedback auditivo basado en protocolos de relajación y atención.
- **Grabación de datos:** Permite la grabación de sesiones EEG para análisis posterior.

## Requisitos

Para utilizar **Neurofeedback.js**, necesitas incluir también **[MuseJS](https://github.com/Respiire/MuseJS)** en tu proyecto. **Muse.js** se encarga de la conexión y la lectura de datos desde el dispositivo Muse.

## Uso

**Conectar al dispositivo Muse y comenzar a leer datos**

La función abre el diálogo de conexión de Web Bluetooth del navegador, permitiendo al usuario seleccionar el dispositivo Muse. Una vez seleccionado el dispositivo, el navegador establece una conexión Bluetooth y comienza a leer los datos EEG del dispositivo Muse. 
```
connectAndReadData();
```

Desconectar del dispositivo Muse
Al detener la grabación, los datos se formatean y se pueden enviar a una función de Bubble o cualquier otro sistema para guardarlos en una base de datos o archivo. Este paso asegura que los datos grabados estén disponibles para análisis posteriores
```
disconnect();
```

## Ajustar la escala de amplitud para el procesamiento de señales
La escala de amplitud en el código se utiliza para ajustar el rango de visualización de los datos EEG. El valor predeterminado es 512. Esto significa que las señales EEG se escalan para que se ajusten dentro de un rango de visualización útil. Puedes cambiar este valor según sea necesario para mejorar la claridad de los datos visualizados.

```
adjustAmplitudeScale(newScale);
```
## Grabación de Sesiones EEG
La grabación de sesiones EEG permite capturar los datos EEG para un análisis posterior. Los datos grabados incluyen el tiempo y el valor EEG en microvoltios. Los datos EEG se almacenan en un arreglo en memoria (RAM) del navegador mientras se está grabando. Estos datos no se guardan en el caché ni en el almacenamiento persistente del navegador (como localStorage o indexedDB) por defecto. Esto significa que si cierras el navegador o recargas la página, los datos grabados se perderán a menos que se hayan procesado y guardado explícitamente en un lugar persistente


**Iniciar grabación**

Cuando se llama a esta función, se inicia la grabación y se almacenan los datos EEG junto con una marca de tiempo en un arreglo en memoria.
```
startRecording();
```

**Detener grabación**

Al detener la grabación, los datos almacenados en el arreglo se procesan. Esta información se puede utilizar posteriormente para análisis. Los datos se formatean como una cadena y se pasan a una función de Bubble.io (Javascript to Bubble) para su manejo.
```
stopRecording();
```

## Feedback

Primero, se realiza una Transformada Rápida de Fourier (FFT) sobre los datos EEG para obtener las amplitudes de diferentes bandas de frecuencia (Theta, Alpha, Beta, Gamma). Para cada banda de frecuencia, se calcula una proporción o ratio sobre la suma de todas las bandas relevantes (Alpha / (Theta + Alpha + Beta + Gamma)). El feedback auditivo proporciona una señal de audio basada en el protocolo de neurofeedback seleccionado. Esto puede ser útil para guiar a los usuarios hacia un estado mental específico.

**Activar feedback auditivo**
```
enableAudioFeedback();
```

**Desactivar el Feedback de Audio**

Reduce gradualmente el volumen del audio hasta silenciarlo.
```
fadeOutAudio();
```

**Protocolo de relajación**

En este protocolo, se espera que las frecuencias Theta y Alpha sean altas mientras que las frecuencias Beta y Gamma son bajas. Esto se calcula utilizando la Transformada Rápida de Fourier (FFT) de las señales EEG. Los niveles de relajación se evalúan observando la relación entre estas bandas de frecuencia

```
setRelaxationProtocol();
```

**Protocolo de atención**

En este protocolo, se espera que las frecuencias Beta y Gamma sean altas mientras que las frecuencias Theta y Alpha son bajas. De nuevo, esto se calcula utilizando la FFT de las señales EEG. Los niveles de atención se evalúan observando la relación entre estas bandas de frecuencia.

```
setAttentionProtocol();
```


>[!CAUTION]
>Esta librería es experimental y está aún en pruebas.


## Licencia
Este proyecto está bajo la licencia MIT. Puedes consultar el archivo LICENSE para más detalles.
