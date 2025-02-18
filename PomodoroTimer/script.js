document.addEventListener('DOMContentLoaded', () => {

    // YouTube API initialization
    let player;
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('player', {
            height: '0',
            width: '0',
            playerVars: {
                'playsinline': 1,
                'controls': 0
            },
            events: {
                'onStateChange': onPlayerStateChange
            }
        });
    };

    function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            player.playVideo();
        }
        if (event.data === YT.PlayerState.PLAYING) {
            updateNowPlaying();
        }
    }

    async function updateNowPlaying() {
        if (player && player.getVideoData) {
            const videoData = player.getVideoData();
            const videoTitle = videoData.title;
            const videoId = videoData.video_id;
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/default.jpg`;
            
            const nowPlayingSection = document.getElementById('now-playing');
            if (nowPlayingSection) {
                nowPlayingSection.innerHTML = `
                    <img src="${thumbnailUrl}" alt="Thumbnail" class="thumbnail">
                    <span class="song-title">${videoTitle}</span>
                `;
            }
        }
    }

    // Load YouTube API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Hardcoded playlists
    const playlists = {
        focus: {
            name: "Focus Music",
            videoId: "jfKfPfyJRdk",
            title: "lofi hip hop radio - beats to relax/study to"
        },
        ambient: {
            name: "Ambient Sounds",
            videoId: "l_7e2ZamUpI",
            title: "lofi hip hop radio - beats to study/relax to"
        },
        lofi: {
            name: "Lo-Fi Beats",
            videoId: "DWcJFNfaw9c",
            title: "lofi hip hop radio - beats to sleep/chill to"
        },
        nature: {
            name: "Nature Sounds",
            videoId: "eKFTSSKCzWA",
            title: "Relaxing Nature Sounds"
        },
        study: {
            name: "Study Music",
            videoId: "lTRiuFIWV54",
            title: "Classical Music for Studying"
        }
    };

    // Update playlist dropdown options
    function updatePlaylistOptions() {
        const playlistSelect = document.getElementById('playlist');
        playlistSelect.innerHTML = '<option value="">Select Playlist</option>';
        
        Object.entries(playlists).forEach(([key, playlist]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = playlist.name;
            playlistSelect.appendChild(option);
        });
    }

    // Initialize playlist options
    updatePlaylistOptions();

    // Function to extract video ID from YouTube URL
    function extractVideoID(url) {
        const playlistMatch = url.match(/[&?]list=([^&]+)/i);
        if (playlistMatch) {
            return playlistMatch[1];
        }
    
        const videoMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\n]+)/i);
        return videoMatch ? videoMatch[1] : null;
    }

    document.getElementById('playlist').addEventListener('change', function(e) {
        const selectedPlaylist = e.target.value && playlists[e.target.value];
        if (selectedPlaylist && player) {
            player.loadVideoById(selectedPlaylist.videoId);
            player.playVideo();
            
            // Update now playing immediately with the known information
            const nowPlayingSection = document.getElementById('now-playing');
            if (nowPlayingSection) {
                nowPlayingSection.innerHTML = `
                    <img src="https://img.youtube.com/vi/${selectedPlaylist.videoId}/default.jpg" alt="Thumbnail" class="thumbnail">
                    <span class="song-title">${selectedPlaylist.title}</span>
                `;
            }
        }
    });

    document.getElementById('play-youtube').addEventListener('click', function() {
        const url = document.getElementById('youtube-link').value;
        const videoId = extractVideoID(url);
        if (videoId && player && player.loadVideoById) {
            player.loadVideoById(videoId);
        }
    });

    function extractVideoID(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : false;
    }

    // Update volume control to affect YouTube player
    const volumeControl = document.getElementById('volume');
    volumeControl.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value);
        if (player && player.setVolume) {
            player.setVolume(volume);
        }
    });

    // Timer settings
    const WORK_TIME = 25 * 60; // 20 seconds for testing
    const BREAK_TIME = 5 * 60; // 20 seconds for testing
    const TimerState = {
        STOPPED: 'stopped',
        RUNNING: 'running',
        PAUSED: 'paused'
    };

    class PomodoroTimer {
        constructor() {
            this.timeLeft = WORK_TIME;
            this.state = TimerState.STOPPED;
            this.isWorkSession = true;
            this.sessionsCompleted = 0;
            this.timerInterval = null;
            this.lastTickTime = null;

            // DOM elements
            this.timerDisplay = document.getElementById('timer');
            this.startButton = document.getElementById('start');
            this.pauseButton = document.getElementById('pause');
            this.resetButton = document.getElementById('reset');
            this.sessionType = document.getElementById('session-type');
            this.sessionsCompletedDisplay = document.getElementById('sessions-completed');
            this.volumeControl = document.getElementById('volume');
            this.workAnimation = document.getElementById('work-animation');
            this.breakAnimation = document.getElementById('break-animation');

            // Audio setup
            this.audioContext = null;
            this.gainNode = null;

            this.initializeEventListeners();
            this.updateDisplay();
        }

        initializeEventListeners() {
            this.startButton.addEventListener('click', () => this.start());
            this.pauseButton.addEventListener('click', () => this.pause());
            this.resetButton.addEventListener('click', () => this.reset());
        }

        initAudio() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.gainNode = this.audioContext.createGain();
                this.gainNode.connect(this.audioContext.destination);
            }
        }

        formatTime(seconds) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }

        updateDisplay() {
            this.timerDisplay.textContent = this.formatTime(this.timeLeft);
            this.sessionType.textContent = this.isWorkSession ? 'Work Session' : 'Break Session';
            this.sessionsCompletedDisplay.textContent = `Sessions completed: ${this.sessionsCompleted}`;
            
            // Update animations
            if (this.state === TimerState.RUNNING) {
                if (this.isWorkSession) {
                    this.workAnimation.classList.add('active');
                    this.breakAnimation.classList.remove('active');
                    this.workAnimation.play();
                    this.breakAnimation.stop();
                } else {
                    this.breakAnimation.classList.add('active');
                    this.workAnimation.classList.remove('active');
                    this.breakAnimation.play();
                    this.workAnimation.stop();
                }
            } else {
                this.workAnimation.classList.remove('active');
                this.breakAnimation.classList.remove('active');
                this.workAnimation.stop();
                this.breakAnimation.stop();
            }
        }

        start() {
            if (this.state !== TimerState.RUNNING) {
                this.initAudio(); // Initialize audio context on user interaction
                this.state = TimerState.RUNNING;
                this.lastTickTime = Date.now();
                this.tick();
            }
        }

        pause() {
            if (this.state === TimerState.RUNNING) {
                this.state = TimerState.PAUSED;
                cancelAnimationFrame(this.timerInterval);
            }
        }

        reset() {
            this.state = TimerState.STOPPED;
            cancelAnimationFrame(this.timerInterval);
            this.timeLeft = WORK_TIME;
            this.isWorkSession = true;
            this.sessionsCompleted = 0;
            this.updateDisplay();
        }

        tick() {
            if (this.state !== TimerState.RUNNING) return;

            const currentTime = Date.now();
            const deltaTime = (currentTime - this.lastTickTime) / 1000;
            this.lastTickTime = currentTime;

            if (this.timeLeft <= 0) {
                this.handleSessionComplete();
            } else {
                this.timeLeft = Math.max(0, this.timeLeft - deltaTime);
                this.updateDisplay();
                this.timerInterval = requestAnimationFrame(() => this.tick());
            }
        }

        handleSessionComplete() {
            this.playNotification();
            
            if (this.isWorkSession) {
                this.sessionsCompleted++;
                this.timeLeft = BREAK_TIME;
                this.isWorkSession = false;
            } else {
                this.timeLeft = WORK_TIME;
                this.isWorkSession = true;
            }

            this.updateDisplay();
            this.lastTickTime = Date.now(); // Reset the tick timer
            this.tick(); // Continue to next session
        }

        playNotification() {
            if (!this.audioContext || !this.gainNode) {
                this.initAudio();
            }

            const oscillator = this.audioContext.createOscillator();
            oscillator.connect(this.gainNode);
            oscillator.type = 'sine';
            
            // Create different sounds for work and break transitions
            if (this.isWorkSession) {
                // Descending tone for work session (inverse of break)
                oscillator.frequency.setValueAtTime(300.33, this.audioContext.currentTime); // D5
                oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.2); // A5
                oscillator.frequency.linearRampToValueAtTime(1174.66, this.audioContext.currentTime + 0.4); // D6
            } else {
                // Happier, more upbeat tone for break
                oscillator.frequency.setValueAtTime(1174.66, this.audioContext.currentTime); // D6
                oscillator.frequency.linearRampToValueAtTime(880, this.audioContext.currentTime + 0.2); // A5
                oscillator.frequency.linearRampToValueAtTime(587.33, this.audioContext.currentTime + 0.4); // D5
            }
            
            const volume = this.volumeControl.value / 100;
            this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            
            if (this.isWorkSession) {
                // Longer fade for work transition
                this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.6);
                this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + 0.7);
            } else {
                // Even longer, smoother fade for break transition
                this.gainNode.gain.exponentialRampToValueAtTime(volume * 0.7, this.audioContext.currentTime + 0.3);
                this.gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
                this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime + 0.9);
            }
            
            oscillator.start();
            setTimeout(() => oscillator.stop(), this.isWorkSession ? 1000 : 1200);
        }
    }

    // Initialize the Pomodoro Timer
    const pomodoroTimer = new PomodoroTimer();

    // Volume control for notification sound
    volumeControl.addEventListener('input', (e) => {
        if (pomodoroTimer.gainNode) {
            pomodoroTimer.gainNode.gain.setValueAtTime(e.target.value / 100, pomodoroTimer.audioContext.currentTime);
        }
    });
});