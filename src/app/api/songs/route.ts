import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { SongWithId } from '@/lib/types';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('test');
    
    const songs = await db.collection<SongWithId>('songs').find().sort({ _id: -1 }).toArray();

    const songsWithAudioSrc = songs.map(song => {
      const { _id, audioFileId, ...rest } = song as any;
      return {
        ...rest,
        id: _id.toString(),
        audioSrc: `/api/songs/audio/${audioFileId.toString()}`,
      };
    });

    return NextResponse.json(songsWithAudioSrc);
  } catch (e: any) {
    console.error("Failed to fetch songs:", e);
    return NextResponse.json({ error: 'Unable to fetch songs', details: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
    try {
        const client = await clientPromise;
        if (!client) {
            throw new Error('Database connection failed');
        }
        const db = client.db('test');
        const bucket = new GridFSBucket(db, { bucketName: 'audio' });

        const formData = await request.formData();
        const audioFile = formData.get('audioFile') as File;
        const title = formData.get('title') as string;
        const artist = formData.get('artist') as string;
        const lyrics = formData.get('lyrics') as string;
        const timedLyrics = formData.get('timedLyrics') as string;
        const coverArt = formData.get('coverArt') as string;

        if (!audioFile || !title || !artist) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        
        const audioFileId = await new Promise<ObjectId>((resolve, reject) => {
            const uploadStream = bucket.openUploadStream(audioFile.name, {
                contentType: audioFile.type,
            });
            Readable.from(audioBuffer).pipe(uploadStream)
            .on('error', (err) => {
                console.error('GridFS upload error:', err);
                reject(err);
            })
            .on('finish', () => {
                resolve(uploadStream.id);
            });
        });

        const newSong: Omit<SongWithId, '_id' | 'audioFileId'> & { audioFileId: ObjectId } = {
            title,
            artist,
            lyrics,
            timedLyrics,
            coverArt,
            isFavorite: false,
            audioFileId: new ObjectId(audioFileId),
        };

        const result = await db.collection('songs').insertOne(newSong as any);

        const finalSong = {
            id: result.insertedId.toString(),
            title,
            artist,
            lyrics,
            timedLyrics,
            coverArt,
            isFavorite: false,
            audioSrc: `/api/songs/audio/${audioFileId.toString()}`
        }

        return NextResponse.json(finalSong, { status: 201 });

    } catch (e) {
        console.error('Failed to create song:', e);
        return NextResponse.json({ error: 'Failed to create song' }, { status: 500 });
    }
}
