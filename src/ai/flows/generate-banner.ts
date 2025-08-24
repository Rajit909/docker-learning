'use server';

/**
 * @fileOverview A Genkit flow for generating a song banner/cover art image.
 *
 * It includes:
 * - `generateBanner`: An async function that takes a song title and artist and returns an image data URI.
 * - `GenerateBannerInput`: The input type for the `generateBanner` function.
 * - `GenerateBannerOutput`: The output type for the `generateBanner` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateBannerInputSchema = z.object({
  title: z.string().describe('The title of the song.'),
  artist: z.string().describe('The artist of the song.'),
});
export type GenerateBannerInput = z.infer<typeof GenerateBannerInputSchema>;

const GenerateBannerOutputSchema = z.object({
  bannerDataUri: z
    .string()
    .describe(
      "The generated banner image as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateBannerOutput = z.infer<typeof GenerateBannerOutputSchema>;

export async function generateBanner(
  input: GenerateBannerInput
): Promise<GenerateBannerOutput> {
  return generateBannerFlow(input);
}

const generateBannerFlow = ai.defineFlow(
  {
    name: 'generateBannerFlow',
    inputSchema: GenerateBannerInputSchema,
    outputSchema: GenerateBannerOutputSchema,
  },
  async ({ title, artist }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: `Generate a square album cover art for a song titled "${title}" by the artist "${artist}". The style should be vibrant and abstract, evoking a sense of energy and motion.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media.url) {
      throw new Error('Image generation failed to produce an output.');
    }

    return {
      bannerDataUri: media.url,
    };
  }
);
