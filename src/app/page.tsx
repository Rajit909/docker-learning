'use client';

import { Player } from '@/components/player';
import { MusicPlayerProvider } from '@/context/music-player-provider';

export default function Home() {
  return (
    <MusicPlayerProvider>
      <main>
        <Player />
      </main>
    </MusicPlayerProvider>
  );
}
