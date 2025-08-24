
'use client';

import { useMusicPlayer } from '@/context/music-player-provider';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/formatters';
import { Mic, StopCircle, Music, Ear, Save, Loader2, Play, Pause, Pencil } from 'lucide-react';
import { EditSongSheet } from './edit-song-sheet';

export function PlayerControls() {
  const {
    progress,
    duration,
    seek,
    songs,
    isPracticeMode,
    togglePracticeMode,
    isRecording,
    toggleRecording,
    recordedAudioUrl,
    playRecording,
    isPlayingRecording,
    isPlaingOriginal,
    play,
    pause,
    isPlaying,
    saveRecording,
    isSavingRecording,
    currentSong,
    togglePlay,
  } = useMusicPlayer();

  const handleSliderChange = (value: number[]) => {
    seek(value[0]);
  };

  if (songs.length === 0 && !isPracticeMode) {
    return null;
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
      <div className="mx-auto max-w-4xl">
        {currentSong && (
             <div className="mb-2 text-center flex justify-center items-center gap-2">
                <div>
                    <h2 className="text-lg font-bold">{currentSong.title}</h2>
                    <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
                </div>
                <EditSongSheet song={currentSong}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                    </Button>
                </EditSongSheet>
            </div>
        )}
        <div className="flex items-center gap-4">
          <span className="w-12 text-xs text-muted-foreground">{formatTime(progress)}</span>
          <Slider
            value={[progress]}
            max={duration || 100}
            step={1}
            onValueChange={handleSliderChange}
            className="w-full"
            aria-label="Song progress"
          />
          <span className="w-12 text-xs text-muted-foreground">{formatTime(duration)}</span>
        </div>
        <div className="flex justify-center items-center h-16 gap-4">
            <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={togglePracticeMode} disabled={songs.length === 0}>
                <Mic className={isPracticeMode ? 'text-primary' : ''} />
            </Button>
            {isPracticeMode ? (
                <>
                <Button variant="ghost" size="icon" className="rounded-full h-16 w-16" onClick={toggleRecording} disabled={!isPracticeMode || isSavingRecording}>
                    {isRecording ? <StopCircle className="text-destructive h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={playRecording} disabled={!recordedAudioUrl || isRecording || isSavingRecording}>
                    <Ear className={isPlayingRecording ? 'text-primary' : ''}/>
                </Button>
                 <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={() => play()} disabled={isRecording || isSavingRecording}>
                    <Music className={isPlaingOriginal ? 'text-primary' : ''} />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full h-12 w-12" onClick={saveRecording} disabled={!recordedAudioUrl || isRecording || isSavingRecording}>
                    {isSavingRecording ? <Loader2 className="animate-spin" /> : <Save />}
                </Button>
                </>
            ) : (
                <>
                     <Button variant="ghost" size="icon" className="rounded-full h-16 w-16" onClick={togglePlay} disabled={songs.length === 0}>
                        {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                    </Button>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
