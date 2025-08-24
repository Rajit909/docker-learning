'use client';

import { useMusicPlayer } from '@/context/music-player-provider';
import { useEffect, useState, useRef } from 'react';
import type { Recording } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Loader2, Music4 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

export function RecordingsList() {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [nowPlaying, setNowPlaying] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { isPlaying: isOriginalSongPlaying, pause: pauseOriginalSong } = useMusicPlayer();

    useEffect(() => {
        const fetchRecordings = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/recordings');
                if (!response.ok) throw new Error('Failed to fetch recordings');
                const data = await response.json();
                setRecordings(data);
            } catch (error) {
                console.error(error);
                toast({
                    title: 'Error',
                    description: 'Could not load your recordings.',
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchRecordings();
    }, [toast]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setNowPlaying(null);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('ended', handleEnded);
        }
    }, []);

    const handlePlayPause = (recording: Recording) => {
        if (isOriginalSongPlaying) {
            pauseOriginalSong();
        }
        
        const audio = audioRef.current;
        if (!audio) return;

        if (nowPlaying === recording.id && !audio.paused) {
            audio.pause();
            setNowPlaying(null);
        } else {
            audio.src = recording.audioSrc;
            audio.play().catch(e => console.error("Playback failed", e));
            setNowPlaying(recording.id);
        }
    };
    
    if (isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground bg-black/50">
                <Loader2 className="h-12 w-12 animate-spin mb-4 text-white" />
                <h2 className="text-2xl font-bold text-white">Loading Recordings...</h2>
            </div>
        )
    }

    return (
        <div className="h-full w-full bg-black/50 pt-32 pb-24 text-white">
             <audio ref={audioRef} />
             <ScrollArea className="h-full px-4 md:px-8">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-4xl font-bold mb-8">Your Recordings</h1>
                    {recordings.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {recordings.map((rec) => (
                                <Card key={rec.id} className="bg-white/10 border-white/20 text-white">
                                    <CardHeader>
                                        <CardTitle>{rec.title}</CardTitle>
                                        <CardDescription className="text-white/70">
                                            Originally by {rec.artist}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-4">
                                        <p className="text-sm text-white/70">
                                            Recorded on: {format(new Date(rec.createdAt), "PPP p")}
                                        </p>
                                        <Button 
                                            variant="outline"
                                            className="w-full bg-transparent hover:bg-primary/20 border-primary text-primary hover:text-primary"
                                            onClick={() => handlePlayPause(rec)}
                                        >
                                            {nowPlaying === rec.id ? <Pause className="mr-2"/> : <Play className="mr-2"/>}
                                            {nowPlaying === rec.id ? 'Pause' : 'Play'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center h-[50vh]">
                            <Music4 className="h-16 w-16 mb-4 text-muted-foreground" />
                            <h2 className="text-2xl font-bold">No Recordings Yet</h2>
                            <p className="text-muted-foreground">
                                Use the practice mode on the player to record yourself!
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
