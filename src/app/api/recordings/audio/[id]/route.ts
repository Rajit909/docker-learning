import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { GridFSBucket, ObjectId } from 'mongodb';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const client = await clientPromise;
        const db = client.db('test');
        const bucket = new GridFSBucket(db, { bucketName: 'recordings' });
        
        const fileId = new ObjectId(params.id);

        const downloadStream = bucket.openDownloadStream(fileId);
        
        const file = await db.collection('recordings.files').findOne({ _id: fileId });

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const headers = new Headers();
        headers.set('Content-Type', file.contentType || 'application/octet-stream');
        headers.set('Content-Length', file.length.toString());
        headers.set('Accept-Ranges', 'bytes');

        return new NextResponse(downloadStream as any, { headers });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Unable to fetch recording audio' }, { status: 500 });
    }
}
