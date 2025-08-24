'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating timed lyrics.
 *
 * It includes:
 * - `generateTimedLyrics`: An async function that takes audio data and plain lyrics and returns lyrics in LRC format.
 * - `GenerateTimedLyricsInput`: The input type for the `generateTimedLyrics` function.
 * - `GenerateTimedLyricsOutput`: The output type for the `generateTimedLyrics` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTimedLyricsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The song's audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  lyrics: z.string().describe('The plain text lyrics of the song.'),
});

export type GenerateTimedLyricsInput = z.infer<typeof GenerateTimedLyricsInputSchema>;

const GenerateTimedLyricsOutputSchema = z.object({
  timedLyrics: z.string().describe('The generated lyrics in LRC format (e.g., [mm:ss.xx]Lyric line).'),
});

export type GenerateTimedLyricsOutput = z.infer<typeof GenerateTimedLyricsOutputSchema>;

export async function generateTimedLyrics(
  input: GenerateTimedLyricsInput
): Promise<GenerateTimedLyricsOutput> {
  return generateTimedLyricsFlow(input);
}

const generateTimedLyricsPrompt = ai.definePrompt({
  name: 'generateTimedLyricsPrompt',
  input: {schema: GenerateTimedLyricsInputSchema},
  output: {schema: GenerateTimedLyricsOutputSchema},
  prompt: `You are an expert audio analyst. Your task is to synchronize the provided lyrics with the audio of a song.
Analyze the audio and provide the lyrics in LRC format. Each line must have a timestamp in the format [mm:ss.xx].

Audio: {{media url=audioDataUri}}
Lyrics:
{{{lyrics}}}

LRC Lyrics:`,
});

const generateTimedLyricsFlow = ai.defineFlow(
  {
    name: 'generateTimedLyricsFlow',
    inputSchema: GenerateTimedLyricsInputSchema,
    outputSchema: GenerateTimedLyricsOutputSchema,
  },
  async input => {
    const {output} = await generateTimedLyricsPrompt(input);
    return output!;
  }
);
