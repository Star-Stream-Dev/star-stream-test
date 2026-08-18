import { createContext, useContext, useState, useRef, useEffect, ReactNode, useCallback } from 'react';

export type RepeatMode = 'off' | 'one' | 'all';

interface YouTubeTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  fileUrl?: string; // For user-uploaded music
}

export interface UserUploadedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
  fileUrl: string;
}

interface YouTubeMusicContextType {
  tracks: YouTubeTrack[];
  setTracks: (tracks: YouTubeTrack[]) => void;
  currentTrack: YouTubeTrack | null;
  isPlaying: boolean;
  playTrack: (track: YouTubeTrack) => void;
  playUserUploadedSong: (song: UserUploadedSong) => void;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  volume: number;
  setVolume: (vol: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  repeatMode: RepeatMode;
  setRepeatMode: (mode: RepeatMode) => void;
  isShuffled: boolean;
  setIsShuffled: (shuffled: boolean) => void;
  progress: number;
  currentTime: number;
  duration: number;
  seekTo: (percent: number) => void;
  playerReady: boolean;
  isPlayingUserUpload: boolean;
  // Legacy support
  isLooping: boolean;
  setIsLooping: (loop: boolean) => void;
}

const YouTubeMusicContext = createContext<YouTubeMusicContextType | null>(null);

const STORAGE_KEY_REPEAT = 'starstream_yt_repeat_mode';
const STORAGE_KEY_SHUFFLE = 'starstream_yt_shuffle';

export function useYouTubeMusic() {
  const context = useContext(YouTubeMusicContext);
  if (!context) {
    throw new Error('useYouTubeMusic must be used within YouTubeMusicProvider');
  }
  return context;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function YouTubeMusicProvider({ children }: { children: ReactNode }) {
  const [tracks, setTracksState] = useState<YouTubeTrack[]>([]);
  const [shuffledTracks, setShuffledTracks] = useState<YouTubeTrack[]>([]);
  const [currentTrack, setCurrentTrack] = useState<YouTubeTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_REPEAT);
    return (saved as RepeatMode) || 'off';
  });
  const [isShuffled, setIsShuffledState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_SHUFFLE) === 'true';
  });
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const [isPlayingUserUpload, setIsPlayingUserUpload] = useState(false);
  
  const playerRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Persist settings
  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
    localStorage.setItem(STORAGE_KEY_REPEAT, mode);
  }, []);

  const setIsShuffled = useCallback((shuffled: boolean) => {
    setIsShuffledState(shuffled);
    localStorage.setItem(STORAGE_KEY_SHUFFLE, String(shuffled));
    if (shuffled && tracks.length > 0) {
      setShuffledTracks(shuffleArray(tracks));
    }
  }, [tracks]);

  // Set tracks and update shuffle order
  const setTracks = useCallback((newTracks: YouTubeTrack[]) => {
    setTracksState(newTracks);
    if (isShuffled) {
      setShuffledTracks(shuffleArray(newTracks));
    }
  }, [isShuffled]);

  // Get the active track list (shuffled or normal)
  const getActiveTrackList = useCallback(() => {
    if (isShuffled && shuffledTracks.length > 0) {
      return shuffledTracks;
    }
    return tracks;
  }, [isShuffled, shuffledTracks, tracks]);

  // Legacy isLooping support (maps to repeatMode === 'one')
  const isLooping = repeatMode === 'one';
  const setIsLooping = useCallback((loop: boolean) => {
    setRepeatMode(loop ? 'one' : 'off');
  }, [setRepeatMode]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiLoaded(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setApiLoaded(true);
    };
  }, []);

  // Create hidden player container
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement('div');
      container.id = 'youtube-music-player-container';
      container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 1px; height: 1px; opacity: 0; pointer-events: none;';
      document.body.appendChild(container);
      containerRef.current = container;
    }

    return () => {
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const startProgressTracking = useCallback(() => {
    stopProgressTracking();
    progressInterval.current = setInterval(() => {
      const player = playerRef.current;
      if (player?.getCurrentTime && player?.getDuration) {
        const current = player.getCurrentTime();
        const total = player.getDuration();
        setCurrentTime(current);
        setDuration(total);
        setProgress(total > 0 ? (current / total) * 100 : 0);
      }
    }, 500);
  }, [stopProgressTracking]);

  // Keep the latest handler functions in refs so the YT player doesn't get destroyed
  // and recreated every time state (like currentTrack) changes.
  const handlersRef = useRef({
    startProgress: () => {},
    stopProgress: () => {},
    onEnded: () => {},
  });

  // Replay current track
  const replayCurrentTrack = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReady || !currentTrack) return;

    try {
      player.loadVideoById?.(currentTrack.id, 0);
      setTimeout(() => {
        try {
          player.playVideo?.();
        } catch {
          // ignore
        }
      }, 50);
    } catch {
      try {
        player.seekTo?.(0, true);
        player.playVideo?.();
      } catch {
        // ignore
      }
    }
  }, [currentTrack, playerReady]);

  const playTrack = useCallback(
    (track: YouTubeTrack) => {
      setCurrentTrack(track);

      // If the user clicked a track before the player is ready, remember it.
      pendingTrackIdRef.current = track.id;
      pendingAutoPlayRef.current = true;

      const player = playerRef.current;
      if (player && playerReady && player.loadVideoById) {
        try {
          player.loadVideoById(track.id);
          // Ensure playback starts even if YouTube doesn't auto-start immediately.
          setTimeout(() => {
            try {
              player.playVideo?.();
            } catch {
              // ignore
            }
          }, 0);
        } catch {
          // ignore
        }
      }
    },
    [playerReady]
  );

  const playNextInternal = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;

    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % activeList.length;

    // If we've looped back to start and repeat is off, stop
    if (nextIndex === 0 && repeatMode === 'off' && currentIndex === activeList.length - 1) {
      return;
    }

    const nextTrack = activeList[nextIndex];
    if (nextTrack) playTrack(nextTrack);
  }, [currentTrack, getActiveTrackList, playTrack, repeatMode]);

  // Handle when a song ends
  const handleSongEnded = useCallback(() => {
    const player = playerRef.current;
    if (!player || !playerReady || !currentTrack) return;

    const activeList = getActiveTrackList();

    // Repeat One: Always replay the current track
    if (repeatMode === 'one') {
      replayCurrentTrack();
      return;
    }

    // No playlist / single song: Auto-replay the song
    if (activeList.length === 0 || (activeList.length === 1 && activeList[0].id === currentTrack.id)) {
      replayCurrentTrack();
      return;
    }

    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const isLastTrack = currentIndex === activeList.length - 1;

    if (isLastTrack) {
      if (repeatMode === 'all') {
        playTrack(activeList[0]);
      }
      return;
    }

    playNextInternal();
  }, [currentTrack, getActiveTrackList, playNextInternal, playTrack, playerReady, repeatMode, replayCurrentTrack]);

  // Keep handler refs in sync
  useEffect(() => {
    handlersRef.current.startProgress = startProgressTracking;
    handlersRef.current.stopProgress = stopProgressTracking;
    handlersRef.current.onEnded = handleSongEnded;
  }, [handleSongEnded, startProgressTracking, stopProgressTracking]);

  const volumeRef = useRef(volume);
  const pendingTrackIdRef = useRef<string | null>(null);
  const pendingAutoPlayRef = useRef(false);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  // Initialize player when API is ready (MUST be stable: do not depend on currentTrack, etc.)
  useEffect(() => {
    if (!apiLoaded || !containerRef.current || playerRef.current) return;

    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-music-player';
    containerRef.current.appendChild(playerDiv);

    playerRef.current = new window.YT.Player('youtube-music-player', {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: (event: any) => {
          // Use event.target as the authoritative player instance.
          if (event?.target) playerRef.current = event.target;
          setPlayerReady(true);

          // If a track was selected before the player finished initializing, load it now.
          const pendingId = pendingTrackIdRef.current;
          if (pendingId && playerRef.current?.loadVideoById) {
            try {
              playerRef.current.loadVideoById(pendingId);
              if (pendingAutoPlayRef.current) {
                setTimeout(() => {
                  try {
                    playerRef.current?.playVideo?.();
                  } catch {
                    // ignore
                  }
                }, 0);
              }
            } catch {
              // ignore
            }
          }

          // Safely set volume after player is ready
          try {
            playerRef.current?.setVolume?.(volumeRef.current);
          } catch {
            // ignore
          }
        },
        onStateChange: (event: any) => {
          const player = event?.target || playerRef.current;

          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            try {
              setDuration(player?.getDuration?.() ?? 0);
            } catch {
              // ignore
            }
            handlersRef.current.startProgress();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            handlersRef.current.stopProgress();
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            handlersRef.current.stopProgress();
            handlersRef.current.onEnded();
          }
        },
      },
    });

    return () => {
      stopProgressTracking();
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
      }
      playerRef.current = null;
    };
  }, [apiLoaded, stopProgressTracking]);




  const togglePlayPause = useCallback(() => {
    if (!playerRef.current || !playerReady) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying, playerReady]);

  const playNext = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;
    
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = activeList[(currentIndex + 1) % activeList.length];
    if (nextTrack) playTrack(nextTrack);
  }, [currentTrack, getActiveTrackList, playTrack]);

  const playPrevious = useCallback(() => {
    const activeList = getActiveTrackList();
    if (!currentTrack || activeList.length === 0) return;
    
    const currentIndex = activeList.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = activeList[(currentIndex - 1 + activeList.length) % activeList.length];
    if (prevTrack) playTrack(prevTrack);
  }, [currentTrack, getActiveTrackList, playTrack]);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (playerRef.current?.setVolume && playerReady) {
      playerRef.current.setVolume(vol);
    }
  }, [playerReady]);

  useEffect(() => {
    if (playerRef.current?.setVolume && playerReady) {
      playerRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [isMuted, volume, playerReady]);

  const seekTo = useCallback((percent: number) => {
    if (isPlayingUserUpload && audioRef.current) {
      audioRef.current.currentTime = percent * audioRef.current.duration;
    } else if (playerRef.current && playerReady && duration) {
      playerRef.current.seekTo(percent * duration, true);
    }
  }, [duration, playerReady, isPlayingUserUpload]);

  // Play user-uploaded song via HTML5 Audio
  const playUserUploadedSong = useCallback((song: UserUploadedSong) => {
    // Pause YouTube player if playing
    if (playerRef.current?.pauseVideo) {
      try {
        playerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }

    setIsPlayingUserUpload(true);
    setCurrentTrack({
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail || '',
      fileUrl: song.fileUrl,
    });

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        // Could add repeat logic here
      });
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          const current = audioRef.current.currentTime;
          const total = audioRef.current.duration;
          setCurrentTime(current);
          setDuration(total);
          setProgress(total > 0 ? (current / total) * 100 : 0);
        }
      });
      audioRef.current.addEventListener('loadedmetadata', () => {
        if (audioRef.current) {
          setDuration(audioRef.current.duration);
        }
      });
    }

    audioRef.current.src = song.fileUrl;
    audioRef.current.volume = isMuted ? 0 : volume / 100;
    audioRef.current.play();
    setIsPlaying(true);
  }, [isMuted, volume]);

  // Update audio volume when mute/volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [isMuted, volume]);

  // Override togglePlayPause to handle user uploads
  const togglePlayPauseEnhanced = useCallback(() => {
    if (isPlayingUserUpload && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else if (playerRef.current && playerReady) {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    }
  }, [isPlaying, isPlayingUserUpload, playerReady]);

  // When playing a YouTube track, stop user upload audio
  const playTrackEnhanced = useCallback(
    (track: YouTubeTrack) => {
      // Stop user upload audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlayingUserUpload(false);

      setCurrentTrack(track);
      pendingTrackIdRef.current = track.id;
      pendingAutoPlayRef.current = true;

      const player = playerRef.current;
      if (player && playerReady && player.loadVideoById) {
        try {
          player.loadVideoById(track.id);
          setTimeout(() => {
            try {
              player.playVideo?.();
            } catch {
              // ignore
            }
          }, 0);
        } catch {
          // ignore
        }
      }
    },
    [playerReady]
  );

  return (
    <YouTubeMusicContext.Provider
      value={{
        tracks,
        setTracks,
        currentTrack,
        isPlaying,
        playTrack: playTrackEnhanced,
        playUserUploadedSong,
        togglePlayPause: togglePlayPauseEnhanced,
        playNext,
        playPrevious,
        volume,
        setVolume,
        isMuted,
        setIsMuted,
        repeatMode,
        setRepeatMode,
        isShuffled,
        setIsShuffled,
        progress,
        currentTime,
        duration,
        seekTo,
        playerReady,
        isPlayingUserUpload,
        // Legacy
        isLooping,
        setIsLooping,
      }}
    >
      {children}
    </YouTubeMusicContext.Provider>
  );
}
