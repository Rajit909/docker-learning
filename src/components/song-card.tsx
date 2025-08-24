
'use client';

import Image from 'next/image';
import type { Song } from '@/lib/types';
import { useMusicPlayer } from '@/context/music-player-provider';
import { ScrollArea } from './ui/scroll-area';
import { useEffect, useRef, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Heart } from 'lucide-react';

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  const {
    currentSong,
    timedLyrics,
    currentLyricIndex,
    isSeeking,
    setIsSeeking,
    seek,
    toggleFavorite,
    isPlaying,
    play,
    togglePlay,
  } = useMusicPlayer();
  const isCurrentSong = currentSong?.id === song.id;

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const activeLyricRef = useRef<HTMLParagraphElement>(null);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const lyricsToShow = isCurrentSong ? timedLyrics : [];
  const showLyrics = isCurrentSong && lyricsToShow.length > 0;

  const [lyricsVisible, setLyricsVisible] = useState(false);

  const toggleLyrics = () => {
    setLyricsVisible(prev => !prev);
  }

  useEffect(() => {
    // Auto-scroll to the active lyric
    if (showLyrics && activeLyricRef.current && !isSeeking) {
      activeLyricRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentLyricIndex, showLyrics, isSeeking]);

  const handleManualSeek = useCallback(() => {
    if (!scrollAreaRef.current || !showLyrics) return;

    const viewport = scrollAreaRef.current;
    const lyricElements = viewport.querySelectorAll('[data-lyric-time]') as NodeListOf<HTMLParagraphElement>;
    if (lyricElements.length === 0) return;

    // Find the lyric closest to the center of the viewport
    const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2;
    let closestLyric: { element: HTMLParagraphElement, time: number, distance: number } | null = null;

    lyricElements.forEach(elem => {
      const elemTop = elem.offsetTop - viewport.offsetTop;
      const elemCenter = elemTop + elem.clientHeight / 2;
      const distance = Math.abs(viewportCenter - elemCenter);

      if (!closestLyric || distance < closestLyric.distance) {
        const time = parseFloat(elem.dataset.lyricTime || '0');
        if (!isNaN(time)) {
          closestLyric = { element: elem, time, distance };
        }
      }
    });

    if (closestLyric) {
        seek(closestLyric.time);
    }
  }, [showLyrics, seek]);


  const handleLyricsScroll = useCallback(() => {
    // When user starts scrolling, set isSeeking to true
    setIsSeeking(true);
    
    // If there's an existing timeout, clear it
    if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
    }

    // Set a new timeout. If the user doesn't scroll for 500ms,
    // we assume they've stopped and we can perform the seek.
    scrollTimeoutRef.current = setTimeout(() => {
        handleManualSeek();
        // After seeking, allow auto-scroll to resume after a delay
        setTimeout(() => setIsSeeking(false), 2000);
    }, 500); // User has to stop scrolling for 500ms
  }, [setIsSeeking, handleManualSeek]);

  const handleTap = () => {
    const now = new Date().getTime();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      handleDoubleTap();
    } else {
       if (isCurrentSong) {
          togglePlay();
        } else {
          play(song.id);
        }
    }
    lastTap.current = now;
  };

  const handleDoubleTap = () => {
    toggleFavorite(song.id);
    if (!song.isFavorite) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  };
  
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tap event on the card itself
    toggleFavorite(song.id);
    if (!song.isFavorite) {
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
  };


  return (
    <div 
        className="relative h-full w-full select-none" 
        onClick={handleTap}
        onContextMenu={(e) => e.preventDefault()}
    >
      {/* Blurred Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src={song.coverArt || 'https://placehold.co/800x800.png'}
          alt={`${song.title} cover art`}
          fill
          className="object-cover blur-2xl scale-110"
          data-ai-hint="album cover background"
          priority
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
      
      {/* Main Content Area */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center p-4 pt-24 pb-48 text-white">
        
        <div 
            onClick={handleFavoriteClick} 
            className="absolute top-24 right-4 z-30 p-2 cursor-pointer"
        >
            {song.isFavorite ? (
                <Heart className="h-8 w-8 text-red-500/80 drop-shadow-lg" fill="currentColor" />
            ) : (
                showHeart ? (
                <Heart className="h-8 w-8 text-red-500/80 animate-in fade-in-0 zoom-in-75 drop-shadow-lg" fill="currentColor" />
                ) : (
                <Heart className="h-8 w-8 text-white/70 hover:text-white/90 transition-colors drop-shadow-lg" />
                )
            )}
        </div>

        {/* Album Art */}
        <div className={cn(
            "relative w-full max-w-[70vw] aspect-square transition-all duration-500 ease-in-out",
            "md:max-w-[50vw] lg:max-w-[35vw]",
            lyricsVisible ? 'max-w-[40vw] md:max-w-[30vw] lg:max-w-[20vw] -translate-y-12' : ''
        )}>
            <Image
                src={song.coverArt || 'https://placehold.co/800x800.png'}
                alt={`${song.title} cover art`}
                fill
                className="object-cover rounded-lg shadow-2xl"
                data-ai-hint="album cover"
                priority
            />
        </div>

        {/* Show/Hide Lyrics Button */}
        {song.lyrics && (
           <div className="absolute bottom-48">
             <Button
                variant="ghost"
                className="z-10 text-white/80 hover:text-white backdrop-blur-sm bg-white/10 rounded-full"
                onClick={(e) => {
                e.stopPropagation();
                toggleLyrics();
                }}
            >
                {lyricsVisible ? 'Hide Lyrics' : 'Show Lyrics'}
            </Button>
           </div>
        )}
      </div>

      {/* Lyrics Overlay */}
      {lyricsVisible && isCurrentSong && (
         <div 
          className="absolute inset-0 bg-black/0 z-20"
          onClick={(e) => {
            e.stopPropagation();
            handleTap();
          }}
        >
          <ScrollArea 
            className="h-full w-full" 
            onScroll={handleLyricsScroll}
            ref={scrollAreaRef}
          >
              <div className="container mx-auto flex min-h-[calc(100%+1px)] flex-col justify-start pt-[40vh] pb-48">
                {lyricsToShow.map((lyric, index) => (
                  <p
                    key={index}
                    ref={index === currentLyricIndex ? activeLyricRef : null}
                    data-lyric-time={lyric.time}
                    className={cn(
                      'text-center text-2xl font-bold transition-all duration-300 py-4',
                      index === currentLyricIndex ? 'text-primary scale-105' : 'text-white/60'
                    )}
                  >
                    {lyric.text}
                  </p>
                ))}
              </div>
            </ScrollArea>
        </div>
      )}
    </div>
  );
}
