
'use client';

import { useState, type ReactNode } from 'react';
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
import { AddSongData } from '@/lib/types';

const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'];

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  artist: z.string().min(1, 'Artist is required'),
  audioFile: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, 'Audio file is required.')
    .refine(
      (files) => files?.[0]?.size <= 10 * 1024 * 1024,
      `Max file size is 10MB.`
    )
    .refine(
      (files) => ACCEPTED_AUDIO_TYPES.includes(files?.[0]?.type),
      'Only .mp3, .wav, .ogg, and .webm formats are supported.'
    ),
  lyrics: z.string().optional(),
  timedLyrics: z.string().optional(),
  coverArt: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function AddSongSheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { addSong } = useMusicPlayer();
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
    defaultValues: {
      coverArt: 'https://placehold.co/800x800.png'
    }
  });

  const audioFile = watch('audioFile');
  const title = watch('title');
  const artist = watch('artist');
  const lyrics = watch('lyrics');
  const coverArt = watch('coverArt');

  const handleGenerateLyrics = async () => {
    if (!audioFile?.[0] || !title) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and an audio file to generate lyrics.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingLyrics(true);
    try {
      const audioDataUri = await fileToDataUri(audioFile[0]);
      const result = await generateStarterLyrics({ title, audioDataUri });
      setValue('lyrics', result.lyrics);
      toast({
        title: 'Lyrics Generated!',
        description: 'Feel free to edit them as you wish.',
      });
    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate lyrics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };
  
  const handleGenerateBanner = async () => {
    if (!title || !artist) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a title and an artist to generate a banner.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingBanner(true);
    try {
      const result = await generateBanner({ title, artist });
      setValue('coverArt', result.bannerDataUri);
      toast({
        title: 'Banner Generated!',
        description: 'A new cover art has been created for your song.',
      });
    } catch (error) {
      console.error('Error generating banner:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate banner. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingBanner(false);
    }
  };

  const handleSyncLyrics = async () => {
    if (!audioFile?.[0] || !lyrics) {
      toast({
        title: 'Missing Information',
        description: 'Please provide an audio file and lyrics to sync.',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const audioDataUri = await fileToDataUri(audioFile[0]);
      const result = await generateTimedLyrics({ lyrics, audioDataUri });
      setValue('timedLyrics', result.timedLyrics);
      toast({
        title: 'Lyrics Synced!',
        description: 'Your lyrics now have timestamps.',
      });
    } catch (error) {
      console.error('Error syncing lyrics:', error);
      toast({
        title: 'Sync Failed',
        description: 'Could not sync lyrics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSaving(true);
    try {
        await addSong(data as AddSongData);
        toast({
            title: 'Song Added!',
            description: `${data.title} by ${data.artist} has been added to your library.`,
        });
        reset({
          title: '',
          artist: '',
          lyrics: '',
          timedLyrics: '',
          coverArt: 'https://placehold.co/800x800.png',
          audioFile: undefined
        });
        setOpen(false);
    } catch (error) {
        console.error("Failed to add song:", error);
        toast({
            title: 'Error',
            description: 'Failed to add the song. Please try again.',
            variant: 'destructive',
        });
    } finally {
        setIsSaving(false);
    }
  };
  
  const isAiBusy = isGeneratingLyrics || isSyncing || isGeneratingBanner || isSaving;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset({
          title: '',
          artist: '',
          lyrics: '',
          timedLyrics: '',
          coverArt: 'https://placehold.co/800x800.png',
          audioFile: undefined
        });
      }
    }}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="p-6">
          <SheetTitle>Add a New Song</SheetTitle>
          <SheetDescription>
            Upload your music and use AI to kickstart and sync your lyrics.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 px-6">
          <form id="add-song-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Label htmlFor="audioFile">Audio File</Label>
              <Input id="audioFile" type="file" accept={ACCEPTED_AUDIO_TYPES.join(',')} {...register('audioFile')} />
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
                    <Image src={coverArt} alt="Cover art preview" layout="fill" objectFit="cover" />
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
          <Button type="submit" form="add-song-form" className="w-full bg-primary hover:bg-primary/90" disabled={isAiBusy}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Song
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
