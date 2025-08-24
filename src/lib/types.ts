import type { ObjectId } from 'mongodb';

export type TimedLyric = {
  time: number;
  text: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  audioSrc: string;
  coverArt: string;
  lyrics: string;
  timedLyrics?: string;
  isFavorite?: boolean;
};

export type SongWithId = {
    _id: ObjectId;
    title: string;
    artist: string;
    coverArt: string;
    lyrics: string;
    timedLyrics?: string;
    isFavorite?: boolean;
    audioFileId: ObjectId;
}

export type Recording = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  audioSrc: string;
  createdAt: string;
};

export type AddSongData = {
    title: string;
    artist: string;
    audioFile: FileList | File[];
    lyrics?: string;
    timedLyrics?: string;
    coverArt?: string;
};

