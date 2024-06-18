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
