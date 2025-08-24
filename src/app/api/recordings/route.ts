'use server';

import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId, GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db('test');
        
        const recordings = await db.collection('recordings').aggregate([
            {
                $lookup: {
                    from: 'songs',
                    localField: 'songId',
                    foreignField: '_id',
                    as: 'songInfo'
                }
            },
            {
                $unwind: '$songInfo'
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $project: {
                    _id: 1,
                    songId: 1,
                    audioFileId: 1,
                    createdAt: 1,
                    'songInfo.title': 1,
                    'songInfo.artist': 1
                }
            }
        ]).toArray();

        const recordingsWithAudioSrc = recordings.map(rec => ({
            id: (rec._id as ObjectId).toString(),
            songId: (rec.songId as ObjectId).toString(),
            title: rec.songInfo.title,
            artist: rec.songInfo.artist,
            createdAt: rec.createdAt,
            audioSrc: `/api/recordings/audio/${(rec.audioFileId as ObjectId).toString()}`,
        }));

        return NextResponse.json(recordingsWithAudioSrc);

    } catch (e: any) {
        console.error("Failed to fetch recordings:", e);
        return NextResponse.json({ error: 'Unable to fetch recordings', details: e.message }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('test');
    const bucket = new GridFSBucket(db, { bucketName: 'recordings' });

    const formData = await request.formData();
    const audioBlob = formData.get('audioBlob') as Blob;
    const songId = formData.get('songId') as string;

    if (!audioBlob || !songId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
    
    const audioFileId = await new Promise<ObjectId>((resolve, reject) => {
        const uploadStream = bucket.openUploadStream(`recording-${songId}-${Date.now()}.webm`, {
            contentType: audioBlob.type,
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

    const newRecording = {
      songId: new ObjectId(songId),
      audioFileId: audioFileId,
      createdAt: new Date(),
    };

    await db.collection('recordings').insertOne(newRecording);

    return NextResponse.json({ message: 'Recording saved successfully' }, { status: 201 });

  } catch (e) {
    console.error('Failed to save recording:', e);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }
}
