'use client';

import { VerticalCarousel } from '@/components/vertical-carousel';
import { AddSongSheet } from '@/components/add-song-sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons';
import { Plus, Search } from 'lucide-react';
import { PlayerControls } from './player-controls';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RecordingsList } from './recordings-list';
import { useMusicPlayer } from '@/context/music-player-provider';

export function Player() {
  const { setSearchTerm } = useMusicPlayer();

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-background font-body text-foreground">
      <header className="absolute top-0 left-0 right-0 z-20 flex h-20 items-center justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 md:px-8">
        <div className="flex shrink-0 items-center gap-2">
          <Logo className="h-8 w-8 text-primary" />
          <h1 className="hidden text-2xl font-bold font-headline text-white sm:block">
            LyricFlow
          </h1>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search songs or artists..."
            className="w-full rounded-full bg-black/30 pl-10 text-white backdrop-blur-sm placeholder:text-muted-foreground/80 focus:border-primary/50 focus:ring-primary/50"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className='flex items-center gap-2'>
            <AddSongSheet>
              <Button className="shrink-0 rounded-full bg-primary hover:bg-primary/90">
                <Plus className="mr-0 h-5 w-5 sm:mr-2" />
                <span className="hidden sm:inline">Add Song</span>
              </Button>
            </AddSongSheet>
        </div>
      </header>

      <Tabs defaultValue="player" className="h-full w-full">
        <TabsList className="absolute top-20 left-1/2 z-20 -translate-x-1/2 bg-black/30 text-white backdrop-blur-sm">
          <TabsTrigger value="player">Player</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
        </TabsList>
        <TabsContent value="player" className="h-full w-full border-none p-0 outline-none">
          <VerticalCarousel />
        </TabsContent>
        <TabsContent value="recordings" className="h-full w-full border-none p-0 outline-none">
          <RecordingsList />
        </TabsContent>
      </Tabs>
      
      <PlayerControls />
      
    </div>
  );
}
