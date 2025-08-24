
'use client';

import { useState, type ReactNode, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { useMusicPlayer } from '@/context/music-player-provider';
import { useToast } from '@/hooks/use-toast';
import { fileToDataUri } from '@/lib/utils';
import { generateStarterLyrics } from '@/ai/flows/generate-starter-lyrics';
import { generateTimedLyrics } from '@/ai/flows/generate-timed-lyrics';
import { generateBanner } from '@/ai/flows/generate-banner';
import { Sparkles, Loader2, Timer, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import type { Song } from '@/lib/types';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  // Audio file is optional on edit
  audioFile: z
    .custom<FileList>()
    .refine((files) => files?.length <= 1, 'You can only upload one file.')
    .refine(
      (files) => !files?.[0] || files?.[0]?.size <= 10 * 1024 * 1024,
      `Max file size is 10MB.`
    )
    .refine(
      (files) => !files?.[0] || ACCEPTED_AUDIO_TYPES.includes(files?.[0]?.type),
      'Only .mp3, .wav, .ogg, and .webm formats are supported.'
    )
    .optional(),
  lyrics: z.string().optional(),
  timedLyrics: z.string().optional(),
  coverArt: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function EditSongSheet({ song, children }: { song: Song, children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { updateSong } = useMusicPlayer();
  const { toast } = useToast();
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingBanner, setIsGeneratingBanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
        reset({
            title: song.title,
            artist: song.artist,
            lyrics: song.lyrics,
            timedLyrics: song.timedLyrics,
            coverArt: song.coverArt,
            audioFile: undefined,
        });
    }
  }, [open, song, reset]);
  
  const audioFile = watch('audioFile');
  const title = watch('title');
  const artist = watch('artist');
  const lyrics = watch('lyrics');
  const coverArt = watch('coverArt');
  
  const getAudioDataUri = async (): Promise<string | null> => {
    if (audioFile?.[0]) {
      return fileToDataUri(audioFile[0]);
    }
    if (song.audioSrc) {
      try {
        const response = await fetch(song.audioSrc);
        if (!response.ok) throw new Error('Failed to fetch existing audio');
        const blob = await response.blob();
        // The AI flow needs a file with a valid name/type to infer mimetype
        const file = new File([blob], `existing-audio.${blob.type.split('/')[1] || 'mp3'}`, { type: blob.type });
        return fileToDataUri(file);
      } catch (error) {
        console.error("Error fetching or converting existing audio:", error);
        toast({
          title: 'Audio Error',
          description: 'Could not load existing audio for AI generation.',
          variant: 'destructive',
        });
        return null;
      }
    }
    return null;
  };
  
  const handleGenerateLyrics = async () => {
    if (!title) {
       toast({
         title: 'Title Required',
         description: 'Please provide a title to generate lyrics.',
         variant: 'destructive',
       });
       return;
    }
    
    setIsGeneratingLyrics(true);
    try {
      const audioDataUri = await getAudioDataUri();
      if (!audioDataUri) {
         toast({
           title: 'Audio Required',
           description: 'Please provide an audio file to generate lyrics.',
           variant: 'destructive',
         });
         return;
      }

      const result = await generateStarterLyrics({ title, audioDataUri });
      setValue('lyrics', result.lyrics);
      toast({ title: 'Lyrics Generated!' });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({ title: 'Generation Failed', variant: 'destructive', description: 'Could not generate lyrics. Please try again.' });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };
  
  const handleGenerateBanner = async () => {
    if (!title || !artist) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and an artist.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingBanner(true);
    try {
      const result = await generateBanner({ title, artist });
      setValue('coverArt', result.bannerDataUri);
      toast({ title: 'Banner Generated!' });
    } catch (error) {
      console.error('Error generating banner:', error);
      toast({ title: 'Generation Failed', variant: 'destructive', description: 'Could not generate the banner. Please try again.' });
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleSyncLyrics = async () => {
    if (!lyrics) {
      toast({
        title: 'Missing Information',
        description: 'Please provide lyrics to sync.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const audioDataUri = await getAudioDataUri();
      if (!audioDataUri) {
        toast({
            title: 'Audio Required',
            description: 'Please provide an audio file to sync lyrics.',
            variant: 'destructive'
        });
        return;
      }
      
      const result = await generateTimedLyrics({ lyrics, audioDataUri });
      setValue('timedLyrics', result.timedLyrics);
      toast({ title: 'Lyrics Synced!' });
    } catch (error) {
      console.error('Error syncing lyrics:', error);
      toast({ title: 'Sync Failed', variant: 'destructive', description: 'Could not sync the lyrics. Please try again.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
        await updateSong(song.id, {
            ...data,
            title: data.title || song.title,
            artist: data.artist || song.artist,
        });
        toast({ title: 'Song Updated!' });
        setOpen(false);
    } catch (error) {
        console.error("Failed to update song:", error);
        toast({ title: 'Error', description: 'Failed to update song.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isAiBusy = isGeneratingLyrics || isSyncing || isGeneratingBanner || isSaving;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Edit Song</SheetTitle>
          <SheetDescription>
            Update the details for your song.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <form id={`edit-song-form-${song.id}`} onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div>
              <Label htmlFor="artist">Artist</Label>
              <Input id="artist" {...register('artist')} />
              {errors.artist && <p className="text-sm text-destructive">{errors.artist.message}</p>}
            </div>
            <div>
              <Label htmlFor="audioFile">Audio File (Optional)</Label>
              <Input id="audioFile" type="file" accept={ACCEPTED_AUDIO_TYPES.join(',')} {...register('audioFile')} />
              <p className="text-xs text-muted-foreground mt-1">Leave blank to keep the current audio.</p>
              {errors.audioFile && <p className="text-sm text-destructive">{errors.audioFile.message as string}</p>}
            </div>
            <div className='space-y-2'>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="coverArt">Cover Art</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateBanner} disabled={isAiBusy}>
                    {isGeneratingBanner ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                    <ImageIcon className="mr-2 h-4 w-4 text-primary" />
                    )}
                    Generate
                </Button>
              </div>
              <Input id="coverArt" placeholder="https://... or generate one" {...register('coverArt')} />
              {errors.coverArt && <p className="text-sm text-destructive">{errors.coverArt.message}</p>}
              {coverArt && (
                <div className="mt-2 relative aspect-square w-full max-w-sm mx-auto rounded-md overflow-hidden">
                    <Image src={coverArt} alt="Cover art preview" fill objectFit="cover" />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="lyrics">Lyrics</Label>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateLyrics} disabled={isAiBusy}>
                      {isGeneratingLyrics ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4 text-primary" />
                      )}
                      Generate
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={handleSyncLyrics} disabled={isAiBusy}>
                      {isSyncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Timer className="mr-2 h-4 w-4 text-primary" />
                      )}
                      Sync
                    </Button>
                </div>
              </div>
              <Textarea id="lyrics" {...register('lyrics')} rows={6} placeholder="Paste your lyrics here..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timedLyrics">Timed Lyrics (LRC)</Label>
              <Textarea id="timedLyrics" {...register('timedLyrics')} rows={6} placeholder="[00:12.34] Your lyric line..." />
            </div>
          </form>
        </ScrollArea>
        <SheetFooter className="p-6 bg-background/95 border-t">
          <Button type="submit" form={`edit-song-form-${song.id}`} className="w-full bg-primary hover:bg-primary/90" disabled={isAiBusy}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
