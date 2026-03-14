const AudioSys = {
    ctx: null,
    sfxEnabled: true,
    bgmEnabled: true,
    bgmInterval: null,
    bgmStep: 0,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playTone(freq, type, duration, vol = 0.1, slideFreq = null) {
        if (!this.sfxEnabled) return;
        this.init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        if (slideFreq) {
            osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    roll() {
        // Quick bleeps to simulate rolling dice
        this.playTone(300, 'square', 0.1, 0.05);
        setTimeout(() => this.playTone(400, 'square', 0.1, 0.05), 100);
        setTimeout(() => this.playTone(500, 'square', 0.15, 0.05), 200);
    },

    ladder() {
        // Fast rising arpeggio
        let time = 0;
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.playTone(400 + (i * 100), 'sine', 0.15, 0.1);
            }, time);
            time += 80;
        }
    },

    snake() {
        // Sliding down frequency
        if (!this.sfxEnabled) return;
        this.init();
        this.playTone(600, 'sawtooth', 0.8, 0.1, 100);
    },

    win() {
        // Triumphant chord
        if (!this.sfxEnabled) return;
        this.init();
        this.playTone(440, 'square', 1.0, 0.1); // A4
        this.playTone(554.37, 'square', 1.0, 0.1); // C#5
        this.playTone(659.25, 'square', 1.0, 0.1); // E5
    },

    toggleSFX() {
        this.sfxEnabled = !this.sfxEnabled;
        return this.sfxEnabled;
    },

    toggleBGM() {
        this.bgmEnabled = !this.bgmEnabled;
        if (this.bgmEnabled) {
            this.startBGM();
        } else {
            this.stopBGM();
        }
        return this.bgmEnabled;
    },

    startBGM() {
        this.init();
        if (this.bgmInterval) return;

        // Very simple ambient sequence backing track loop
        const notes = [220, 261.63, 329.63, 261.63, 220, 196, 220, 329.63];

        this.bgmInterval = setInterval(() => {
            if (!this.bgmEnabled) return;
            const freq = notes[this.bgmStep % notes.length];

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            // Very soft background
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.4);

            this.bgmStep++;
        }, 400); // 150 BPM loop
    },

    stopBGM() {
        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
};

window.AudioSys = AudioSys;
