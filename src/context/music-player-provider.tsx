
'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
  useMemo,
} from 'react';
import type { Song, TimedLyric, AddSongData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { parseLRC } from '@/lib/utils';


type UpdateSongData = {
    title?: string;
    artist?: string;
    audioFile?: FileList;
    lyrics?: string;
    timedLyrics?: string;
    coverArt?: string;
    isFavorite?: boolean;
}


interface MusicPlayerContextType {
  songs: Song[];
  currentSong: Song | undefined;
  currentSongIndex: number | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  carouselApi: any;
  setCarouselApi: (api: any) => void;
  play: (songIdOrIndex?: string | number) => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  addSong: (songData: AddSongData) => Promise<void>;
  updateSong: (songId: string, songData: UpdateSongData) => Promise<void>;
  toggleFavorite: (songId: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  timedLyrics: TimedLyric[];
  currentLyricIndex: number;
  isSeeking: boolean;
  setIsSeeking: (isSeeking: boolean) => void;
  isPracticeMode: boolean;
  togglePracticeMode: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  recordedAudioUrl: string | null;
  playRecording: () => void;
  isPlayingRecording: boolean;
  isPlaingOriginal: boolean;
  saveRecording: () => Promise<void>;
  isSavingRecording: boolean;
  isCompressing: boolean;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [carouselApi, setCarouselApi] = useState<any>(null);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(-1);
  const [isSeeking, setIsSeeking] = useState(false);
  const { toast } = useToast();

  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const recordingAudioRef = useRef<HTMLAudioElement>(null);
  const [isSavingRecording, setIsSavingRecording] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);


  const audioRef = useRef<HTMLAudioElement>(null);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);


  const currentSong = currentSongIndex !== null ? filteredSongs[currentSongIndex] : undefined;
  
  const timedLyrics = useMemo(() => {
    if (currentSong?.timedLyrics) {
      return parseLRC(currentSong.timedLyrics);
    }
    return [];
  }, [currentSong]);

  const fetchSongs = useCallback(async () => {
    try {
      const response = await fetch('/api/songs');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch songs response:', errorData);
        throw new Error(`Failed to fetch songs: ${response.statusText}`);
      }
      const data: Song[] = await response.json();
      setSongs(data);
      if (data.length > 0) {
        setCurrentSongIndex(0);
      } else {
        setCurrentSongIndex(null);
      }
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error Loading Songs',
        description: 'Could not load songs from the library.',
        variant: 'destructive',
      })
    }
  }, [toast]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const newFilteredSongs = songs.filter((song) =>
      song.title.toLowerCase().includes(lowercasedFilter) ||
      song.artist.toLowerCase().includes(lowercasedFilter)
    );
    setFilteredSongs(newFilteredSongs);
    
    if (newFilteredSongs.length > 0) {
      const currentSongStillExists = newFilteredSongs.some(s => s.id === currentSong?.id);
      if (!currentSongStillExists) {
        setCurrentSongIndex(0);
        if (carouselApi) {
            carouselApi.scrollTo(0, true);
        }
      }
    } else {
      setCurrentSongIndex(null);
    }

  }, [searchTerm, songs, carouselApi, currentSong?.id]);

  const playSongAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < filteredSongs.length && audioRef.current) {
      const songToPlay = filteredSongs[index];
      const audio = audioRef.current;

      const startPlayback = () => {
        if (!audioRef.current) return;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
          }).catch(e => {
            console.error("Playback failed", e);
            setIsPlaying(false);
          });
        }
      };

      if (audio.src !== songToPlay.audioSrc) {
        audio.src = songToPlay.audioSrc;
        audio.load();
        const canPlayHandler = () => {
          if (isPlayingRef.current) {
            startPlayback();
          }
        };
        audio.addEventListener('canplay', canPlayHandler, { once: true });
      } else {
        startPlayback();
      }
    }
  }, [filteredSongs]);


  const play = useCallback((songIdOrIndex?: string | number) => {
    let targetIndex: number | undefined;

    if (typeof songIdOrIndex === 'string') {
        targetIndex = filteredSongs.findIndex(s => s.id === songIdOrIndex);
    } else if (typeof songIdOrIndex === 'number') {
        targetIndex = songIdOrIndex;
    } else {
        targetIndex = currentSongIndex ?? 0;
    }

    if (targetIndex !== undefined && targetIndex !== -1 && targetIndex < filteredSongs.length) {
      if (currentSongIndex !== targetIndex) {
        setCurrentSongIndex(targetIndex);
        if(carouselApi?.selectedScrollSnap() !== targetIndex) {
            carouselApi?.scrollTo(targetIndex);
        }
      }
      setIsPlaying(true); // Optimistically set playing state
      playSongAtIndex(targetIndex);
    }
  }, [currentSongIndex, filteredSongs, playSongAtIndex, carouselApi]);


  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (filteredSongs.length === 0) return;
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [play, pause, filteredSongs.length]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);
  
  const addSong = useCallback(async (data: AddSongData) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('artist', data.artist);
    
    let audioFile = Array.isArray(data.audioFile) ? data.audioFile[0] : data.audioFile.item(0);
    if (!audioFile) {
        throw new Error('No audio file provided');
    }

    formData.append('audioFile', audioFile);

    formData.append('lyrics', data.lyrics || '');
    formData.append('timedLyrics', data.timedLyrics || '');
    formData.append('coverArt', data.coverArt || 'https://placehold.co/800x800.png');
    
    const response = await fetch('/api/songs', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to add song');
    }
    
    const newSong = await response.json();
    setSongs(prev => [newSong, ...prev]);
  }, []);
  
  const updateSong = useCallback(async (songId: string, data: UpdateSongData) => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.artist) formData.append('artist', data.artist);
    if (data.audioFile?.[0]) {
        let audioFile = data.audioFile[0];
        formData.append('audioFile', audioFile);
    }
    if (data.lyrics !== null && data.lyrics !== undefined) formData.append('lyrics', data.lyrics);
    if (data.timedLyrics !== null && data.timedLyrics !== undefined) formData.append('timedLyrics', data.timedLyrics);
    if (data.coverArt !== null && data.coverArt !== undefined) formData.append('coverArt', data.coverArt);
    if (data.isFavorite !== undefined) formData.append('isFavorite', String(data.isFavorite));

    const response = await fetch(`/api/songs/${songId}`, {
        method: 'PUT',
        body: formData,
    });

    if (!response.ok) {
        throw new Error('Failed to update song');
    }

    const updatedSong = await response.json();
    
    const updateSongInState = (prev: Song[]) => 
        prev.map(s => (s.id === songId ? { ...s, ...updatedSong } : s));

    setSongs(updateSongInState);

  }, []);
  
  const toggleFavorite = useCallback(async (songId: string) => {
    const song = songs.find(s => s.id === songId);
    if (!song) return;
    await updateSong(songId, { isFavorite: !song.isFavorite });
  }, [songs, updateSong]);

  const startRecording = useCallback(async () => {
    try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;

        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = context;

        const micSource = context.createMediaStreamSource(micStream);
        
        if (!audioRef.current) throw new Error("Audio element not available");
        
        // Ensure audio element is ready for a new recording session.
        if(audioRef.current.src !== currentSong?.audioSrc) {
          audioRef.current.src = currentSong?.audioSrc || '';
          audioRef.current.load();
        }
        
        const onCanPlay = () => {
          if (!audioRef.current || !audioContextRef.current || audioContextRef.current.state === 'closed') return;
          audioRef.current.removeEventListener('canplaythrough', onCanPlay);

          try {
            const songSource = audioContextRef.current.createMediaElementSource(audioRef.current);
            const mixedStreamDestination = audioContextRef.current.createMediaStreamDestination();

            micSource.connect(mixedStreamDestination);
            songSource.connect(mixedStreamDestination);
            songSource.connect(audioContextRef.current.destination);

            const recorder = new MediaRecorder(mixedStreamDestination.stream);
            setMediaRecorder(recorder);
            recordedChunks.current = [];
            
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunks.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordedAudioUrl(url);
                
                micStream.getTracks().forEach(track => track.stop());
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                  audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
                }
            };

            recorder.start();
            setIsRecording(true);
            setIsPlaying(true);
            audioRef.current.play().catch(e => console.error("Playback failed during recording start:", e));
          } catch(e) {
             console.error("Error setting up audio graph:", e);
             toast({
                title: "Recording Error",
                description: "Could not mix audio. Please try again.",
                variant: "destructive",
             });
             setIsPracticeMode(false);
          }
        };

        if (audioRef.current.readyState >= 4) { // HAVE_ENOUGH_DATA
          onCanPlay();
        } else {
          audioRef.current.addEventListener('canplaythrough', onCanPlay, { once: true });
        }

    } catch (err) {
        console.error("Failed to start recording:", err);
        toast({
            title: "Recording Error",
            description: "Could not access microphone or mix audio.",
            variant: "destructive",
        });
        setIsPracticeMode(false);
    }
  }, [currentSong, toast]);

  const stopRecording = useCallback(() => {
      if (mediaRecorder && isRecording) {
          mediaRecorder.stop();
          setIsRecording(false);
          pause();
          micStreamRef.current?.getTracks().forEach(track => track.stop());
          if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close().catch(e => console.error("Error closing audio context", e));
          }
      }
  }, [mediaRecorder, isRecording, pause]);

  const toggleRecording = useCallback(() => {
      if (isRecording) {
          stopRecording();
      } else {
          startRecording();
      }
  }, [isRecording, startRecording, stopRecording]);

  const togglePracticeMode = () => {
    if (isPracticeMode) {
      if(isRecording) stopRecording();
      setRecordedAudioUrl(null);
    }
    setIsPracticeMode(prev => !prev);
  };
  
  const playRecording = () => {
    if (recordedAudioUrl && recordingAudioRef.current) {
        if(isPlayingRecording) {
            recordingAudioRef.current.pause();
            setIsPlayingRecording(false);
        } else {
            pause();
            recordingAudioRef.current.src = recordedAudioUrl;
            recordingAudioRef.current.play();
            setIsPlayingRecording(true);
        }
    }
  };

  const saveRecording = async () => {
    if (!recordedAudioUrl || !currentSong) {
      toast({ title: 'Error', description: 'No recording or song to save.', variant: 'destructive' });
      return;
    }
    setIsSavingRecording(true);
    try {
      const audioBlob = await fetch(recordedAudioUrl).then(r => r.blob());
      const formData = new FormData();
      formData.append('audioBlob', audioBlob);
      formData.append('songId', currentSong.id);

      const response = await fetch('/api/recordings', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save recording');
      }

      toast({
        title: 'Recording Saved!',
        description: 'Your practice session has been saved.',
      });
      setRecordedAudioUrl(null); // Clear recording after saving
    } catch (error) {
      console.error('Failed to save recording:', error);
      toast({ title: 'Save Failed', description: 'Could not save your recording.', variant: 'destructive' });
    } finally {
      setIsSavingRecording(false);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.crossOrigin = "anonymous";

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setProgress(currentTime);

      let newLyricIndex = -1;
      // Using a for loop for performance and compatibility
      for (let i = timedLyrics.length - 1; i >= 0; i--) {
        if (currentTime >= timedLyrics[i].time) {
          newLyricIndex = i;
          break;
        }
      }

      if (newLyricIndex !== currentLyricIndex) {
        setCurrentLyricIndex(newLyricIndex);
      }
    };

    const handleDurationChange = () => setDuration(audio.duration);
    const handleSongEnd = () => {
        setIsPlaying(false);
        if (carouselApi && carouselApi.canScrollNext()) {
            carouselApi.scrollNext();
        }
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleSongEnd);
    audio.addEventListener('play', () => { if(isPlayingRecording) setIsPlayingRecording(false); });

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleSongEnd);
    };
  }, [carouselApi, timedLyrics, currentLyricIndex, isPlayingRecording]);
  
  useEffect(() => {
    const recordingAudio = recordingAudioRef.current;
    if (!recordingAudio) return;

    const handleRecordingEnd = () => {
      setIsPlayingRecording(false);
    };
    recordingAudio.addEventListener('ended', handleRecordingEnd);
    return () => {
      recordingAudio.removeEventListener('ended', handleRecordingEnd);
    };
  }, []);

  // Effect for handling the current song change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
  
    if (currentSong) {
      const wasPlaying = isPlayingRef.current;
      if (audio.src !== currentSong.audioSrc) {
        setProgress(0);
        setDuration(0);
        setCurrentLyricIndex(-1);
        // Only set src if it's different to avoid re-loading the same song
        if (audio.src !== currentSong.audioSrc) {
            audio.src = currentSong.audioSrc;
            audio.load();
        }
      }
      
      if (wasPlaying) {
        const canPlayHandler = () => {
          audio.play().catch(e => console.error("Autoplay interrupted", e));
        };
        // Ensure that the canplay event listener is added only once
        // and is removed after it has done its job.
        audio.addEventListener('canplay', canPlayHandler, { once: true });
        return () => {
          audio.removeEventListener('canplay', canPlayHandler);
        };
      }
    } else {
      audio.src = '';
      setIsPlaying(false);
      setProgress(0);
      setDuration(0);
      setCurrentLyricIndex(-1);
    }
  }, [currentSong]);
  
  // Effect for handling carousel selection
  useEffect(() => {
    if (!carouselApi) return;
  
    const onSelect = () => {
      const newIndex = carouselApi.selectedScrollSnap();
      if (currentSongIndex !== newIndex) {
        setCurrentSongIndex(newIndex);
        if (isPlayingRef.current) {
          const newSong = filteredSongs[newIndex];
          if (audioRef.current && newSong) {
            audioRef.current.src = newSong.audioSrc;
            audioRef.current.load();
            const playPromise = audioRef.current.play();
            if (playPromise) {
              playPromise.catch(error => console.error("Playback was interrupted by new load", error));
            }
          }
        }
      }
    };
  
    carouselApi.on('select', onSelect);
    carouselApi.on('reInit', onSelect);
  
    return () => {
      if (carouselApi.off) { 
        carouselApi.off('select', onSelect);
        carouselApi.off('reInit', onSelect);
      }
    };
  }, [carouselApi, currentSongIndex, filteredSongs]);

  const value = {
    songs: filteredSongs,
    currentSong,
    currentSongIndex,
    isPlaying,
    progress,
    duration,
    audioRef,
    carouselApi,
    setCarouselApi,
    play,
    pause,
    togglePlay,
    seek,
    addSong,
    updateSong,
    toggleFavorite,
    setSearchTerm,
    timedLyrics,
    currentLyricIndex,
    isSeeking,
    setIsSeeking,
    isPracticeMode,
    togglePracticeMode,
    isRecording,
    toggleRecording,
    recordedAudioUrl,
    playRecording,
    isPlayingRecording,
isPlaingOriginal: isPlaying && !isRecording,
    saveRecording,
    isSavingRecording,
    isCompressing,
  };

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" />
      <audio ref={recordingAudioRef} />
    </MusicPlayerContext.Provider>
  );
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext);
  if (context === undefined) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
}
