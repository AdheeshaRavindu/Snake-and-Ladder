const AudioSys = {
    ctx: null,
    sfxEnabled: true,
    bgmEnabled: true,
    bgmInterval: null,
    bgmStep: 0,
    youtubeApiLoading: false,
    youtubeReady: false,
    youtubePlayer: null,
    snakeFallbackTimer: null,
    snakeLocalAudio: null,
    ladderLocalAudio: null,
    bgmLocalAudio: null,
    snakeAudioPath: 'assets/audio/snake.mp3',
    ladderAudioPath: 'assets/audio/ladder.mp3',
    bgmAudioPath: 'assets/audio/BGM.mp3',
    snakeVideoId: '-BqVKDB9sDw',
    ladderVideoId: '08EtnvIy06Q',

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.initLocalClips();

        // Preload snake clip player so it is ready when a snake is hit.
        this.initSnakeClip();
    },

    initLocalClips() {
        if (!this.snakeLocalAudio) {
            this.snakeLocalAudio = this.createLocalAudio(this.snakeAudioPath, 'snakeLocalAudio');
        }
        if (!this.ladderLocalAudio) {
            this.ladderLocalAudio = this.createLocalAudio(this.ladderAudioPath, 'ladderLocalAudio');
        }
        if (!this.bgmLocalAudio) {
            this.bgmLocalAudio = this.createLocalAudio(this.bgmAudioPath, 'bgmLocalAudio');
            if (this.bgmLocalAudio) {
                this.bgmLocalAudio.loop = true;
                this.bgmLocalAudio.volume = 0.25;
            }
        }
    },

    createLocalAudio(path, key) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.addEventListener('error', () => {
            // Missing/invalid local file should quietly fallback to YouTube/synth.
            this[key] = null;
        }, { once: true });
        return audio;
    },

    playLocalClip(kind) {
        if (!this.sfxEnabled) return false;

        const clip = kind === 'snake' ? this.snakeLocalAudio : this.ladderLocalAudio;
        if (!clip) return false;

        try {
            clip.currentTime = 0;
            const maybePromise = clip.play();
            if (maybePromise && typeof maybePromise.catch === 'function') {
                maybePromise.catch(() => {
                    // Playback can fail due to browser policy; fallback paths still exist.
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    },

    initSnakeClip() {
        if (this.youtubeReady || this.youtubeApiLoading) return;

        this.youtubeApiLoading = true;

        let mount = document.getElementById('snakeYoutubePlayer');
        if (!mount) {
            mount = document.createElement('div');
            mount.id = 'snakeYoutubePlayer';
            mount.style.position = 'absolute';
            mount.style.width = '1px';
            mount.style.height = '1px';
            mount.style.opacity = '0';
            mount.style.pointerEvents = 'none';
            mount.style.left = '-9999px';
            document.body.appendChild(mount);
        }

        const initPlayer = () => {
            this.youtubePlayer = new YT.Player('snakeYoutubePlayer', {
                width: '1',
                height: '1',
                videoId: this.snakeVideoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    modestbranding: 1,
                    rel: 0,
                    fs: 0,
                    playsinline: 1
                },
                events: {
                    onReady: () => {
                        this.youtubeReady = true;
                    }
                }
            });
        };

        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            if (typeof prevReady === 'function') prevReady();
            initPlayer();
        };

        if (window.YT && typeof window.YT.Player === 'function') {
            initPlayer();
            return;
        }

        const existingScript = document.querySelector('script[data-youtube-api="true"]');
        if (!existingScript) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.async = true;
            tag.dataset.youtubeApi = 'true';
            document.head.appendChild(tag);
        }
    },

    playSnakeClip() {
        const played = this.playYoutubeClip(this.snakeVideoId, 2500, 'snake');
        if (!played) return false;

        // If YouTube does not actually start (embed blocked/slow), play local fallback.
        if (this.snakeFallbackTimer) {
            clearTimeout(this.snakeFallbackTimer);
            this.snakeFallbackTimer = null;
        }

        this.snakeFallbackTimer = setTimeout(() => {
            try {
                const state = this.youtubePlayer && this.youtubePlayer.getPlayerState
                    ? this.youtubePlayer.getPlayerState()
                    : -1;

                const ytStates = window.YT && window.YT.PlayerState ? window.YT.PlayerState : null;
                const isPlaying = ytStates && (state === ytStates.PLAYING || state === ytStates.BUFFERING);

                if (!isPlaying) {
                    this.playTone(600, 'sawtooth', 0.8, 0.1, 100);
                }
            } catch (e) {
                this.playTone(600, 'sawtooth', 0.8, 0.1, 100);
            } finally {
                this.snakeFallbackTimer = null;
            }
        }, 900);

        return true;
    },

    playLadderClip() {
        return this.playYoutubeClip(this.ladderVideoId, 0, 'ladder');
    },

    playYoutubeClip(videoId, durationMs, label) {
        if (!this.sfxEnabled) return false;
        if (!this.youtubeReady || !this.youtubePlayer) return false;

        try {
            if (this.youtubePlayer.loadVideoById) {
                this.youtubePlayer.loadVideoById({
                    videoId,
                    startSeconds: 0
                });
            } else {
                this.youtubePlayer.playVideo();
            }

            if (durationMs > 0) {
                // Keep selected effects short and avoid overlap when desired.
                setTimeout(() => {
                    if (this.youtubePlayer && this.youtubePlayer.pauseVideo) {
                        this.youtubePlayer.pauseVideo();
                    }
                }, durationMs);
            }

            return true;
        } catch (e) {
            console.warn(`YouTube ${label} clip failed, falling back to synth.`, e);
            return false;
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
        // Prefer local clip, then YouTube clip, then arpeggio fallback.
        this.init();
        const played = this.playLocalClip('ladder') || this.playLadderClip();
        if (!played) {
            let time = 0;
            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    this.playTone(400 + (i * 100), 'sine', 0.15, 0.1);
                }, time);
                time += 80;
            }
        }
    },

    snake() {
        // Prefer local clip, then YouTube clip, then synth fallback.
        this.init();
        const played = this.playLocalClip('snake') || this.playSnakeClip();
        if (!played) {
            this.playTone(600, 'sawtooth', 0.8, 0.1, 100);
        }
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
        if (this.bgmLocalAudio && !this.bgmLocalAudio.paused) return;

        if (this.bgmLocalAudio) {
            this.bgmLocalAudio.currentTime = 0;
            const playPromise = this.bgmLocalAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {
                    // If local BGM is blocked/unavailable, fallback to synth loop.
                    this.startSynthBGM();
                });
            }
            return;
        }

        this.startSynthBGM();
    },

    startSynthBGM() {
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
        if (this.bgmLocalAudio) {
            this.bgmLocalAudio.pause();
            this.bgmLocalAudio.currentTime = 0;
        }

        if (this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
};

window.AudioSys = AudioSys;
