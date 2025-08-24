'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating starter lyrics for a song.
 *
 * It includes:
 * - `generateStarterLyrics`: An async function that takes song audio data and a song title as input and returns generated starter lyrics.
 * - `GenerateStarterLyricsInput`: The input type for the `generateStarterLyrics` function.
 * - `GenerateStarterLyricsOutput`: The output type for the `generateStarterLyrics` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStarterLyricsInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "The song's audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  title: z.string().describe('The title of the song.'),
});

export type GenerateStarterLyricsInput = z.infer<typeof GenerateStarterLyricsInputSchema>;

const GenerateStarterLyricsOutputSchema = z.object({
  lyrics: z.string().describe('The generated starter lyrics for the song.'),
});

export type GenerateStarterLyricsOutput = z.infer<typeof GenerateStarterLyricsOutputSchema>;

export async function generateStarterLyrics(
  input: GenerateStarterLyricsInput
): Promise<GenerateStarterLyricsOutput> {
  return generateStarterLyricsFlow(input);
}

const generateStarterLyricsPrompt = ai.definePrompt({
  name: 'generateStarterLyricsPrompt',
  input: {schema: GenerateStarterLyricsInputSchema},
  output: {schema: GenerateStarterLyricsOutputSchema},
  prompt: `You are an AI lyricist who helps musicians write songs. A musician has provided you with the audio of their song and its title. Please write starter lyrics for the song.

Title: {{{title}}}
Audio: {{media url=audioDataUri}}

Lyrics:`,
});

const generateStarterLyricsFlow = ai.defineFlow(
  {
    name: 'generateStarterLyricsFlow',
    inputSchema: GenerateStarterLyricsInputSchema,
    outputSchema: GenerateStarterLyricsOutputSchema,
  },
  async input => {
    const {output} = await generateStarterLyricsPrompt(input);
    return output!;
  }
);
