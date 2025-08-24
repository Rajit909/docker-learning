import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const client = await clientPromise;
        const db = client.db('test');
        const bucket = new GridFSBucket(db, { bucketName: 'audio' });
        
        const fileId = new ObjectId(params.id);

        const downloadStream = bucket.openDownloadStream(fileId);
        
        const file = await db.collection('audio.files').findOne({ _id: fileId });

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', file.contentType || 'application/octet-stream');
        headers.set('Content-Length', file.length.toString());
        headers.set('Accept-Ranges', 'bytes');

        // ReadableStream is already a valid response body
        return new NextResponse(downloadStream as any, { headers });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Unable to fetch audio' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const client = await clientPromise;
        const db = client.db('test');
        const bucket = new GridFSBucket(db, { bucketName: 'audio' });

        const formData = await request.formData();
        const title = formData.get('title') as string | null;
        const artist = formData.get('artist') as string | null;
        const lyrics = formData.get('lyrics') as string | null;
        const timedLyrics = formData.get('timedLyrics') as string | null;
        const coverArt = formData.get('coverArt') as string | null;
        const audioFile = formData.get('audioFile') as File | null;
        const isFavorite = formData.get('isFavorite') as string | null;
        
        const songId = new ObjectId(params.id);

        const songToUpdate = await db.collection('songs').findOne({ _id: songId });
        if (!songToUpdate) {
            return NextResponse.json({ error: 'Song not found' }, { status: 404 });
        }

        const updateData: any = {};
        if (title) updateData.title = title;
        if (artist) updateData.artist = artist;
        if (lyrics !== null) updateData.lyrics = lyrics;
        if (timedLyrics !== null) updateData.timedLyrics = timedLyrics;
        if (coverArt !== null) updateData.coverArt = coverArt;
        if (isFavorite !== null) updateData.isFavorite = isFavorite === 'true';

        let newAudioFileId = songToUpdate.audioFileId;

        // If a new audio file is uploaded, delete the old one and upload the new one
        if (audioFile && audioFile.size > 0) {
            // Delete old file if it exists
            if (songToUpdate.audioFileId) {
                try {
                    await bucket.delete(new ObjectId(songToUpdate.audioFileId));
                } catch (err: any) {
                    // Ignore if file doesn't exist, but log other errors
                    if (err.code !== 'ENOENT') {
                       console.error("Error deleting old audio file:", err);
                    }
                }
            }

            // Upload new file
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            newAudioFileId = await new Promise<ObjectId>((resolve, reject) => {
                const uploadStream = bucket.openUploadStream(audioFile.name, {
                    contentType: audioFile.type,
                });
                Readable.from(audioBuffer).pipe(uploadStream)
                .on('error', reject)
                .on('finish', () => resolve(uploadStream.id));
            });
            updateData.audioFileId = newAudioFileId;
        }

        if (Object.keys(updateData).length > 0) {
            await db.collection('songs').updateOne({ _id: songId }, { $set: updateData });
        }

        const finalSong = await db.collection('songs').findOne({ _id: songId });
        
        const responseSong = {
            id: songId.toString(),
            title: finalSong?.title,
            artist: finalSong?.artist,
            lyrics: finalSong?.lyrics,
            timedLyrics: finalSong?.timedLyrics,
            coverArt: finalSong?.coverArt,
            isFavorite: finalSong?.isFavorite,
            audioSrc: `/api/songs/audio/${(finalSong?.audioFileId || newAudioFileId).toString()}`
        };
        
        return NextResponse.json(responseSong, { status: 200 });
    } catch (e) {
        console.error('Failed to update song:', e);
        return NextResponse.json({ error: 'Failed to update song' }, { status: 500 });
    }
}
