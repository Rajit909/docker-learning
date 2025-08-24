'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { useMusicPlayer } from '@/context/music-player-provider';
import { SongCard } from './song-card';
import { Music2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export function VerticalCarousel() {
  const { songs, setCarouselApi } = useMusicPlayer();
  const [emblaRef, emblaApi] = useEmblaCarousel({ axis: 'y', skipSnaps: true });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if(emblaApi) {
        setCarouselApi(emblaApi);
    }
  }, [emblaApi, setCarouselApi]);

  useEffect(() => {
    // A slight delay to determine if we are still loading songs.
    const timer = setTimeout(() => {
      if (songs.length === 0) {
        setIsLoading(false);
      }
    }, 500); // Adjust timeout as needed

    if (songs.length > 0) {
        setIsLoading(false);
    }

    return () => clearTimeout(timer);
  }, [songs]);

  if (isLoading) {
    return (
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <h2 className="text-2xl font-bold">Loading Songs...</h2>
            <p>Please wait while we fetch your music library.</p>
        </div>
    )
  }

  return (
    <div className="h-full w-full overflow-hidden" ref={emblaRef}>
      <div className="flex h-full flex-col">
        {songs.length > 0 ? (
          songs.map((song) => (
            <div className="relative min-h-0 shrink-0 basis-full" key={song.id}>
              <SongCard song={song} />
            </div>
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
             <Music2 className="h-12 w-12 mb-4" />
             <h2 className="text-2xl font-bold">No Songs Found</h2>
             <p>Try clearing your search or adding a new song.</p>
          </div>
        )}
      </div>
    </div>
  );
}
