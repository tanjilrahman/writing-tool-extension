import { GoogleGenerativeAI } from '@google/generative-ai';
import { Suggestion, WritingStyle } from '../types/suggestion';

const styles = {
  casual: 'Casual, friendly, human like, everyday language with contractions and simple words',
  formal: 'Structured, proper, business-appropriate language that is clear and direct',
  professional: "Business-appropriate language that's clear and direct",
  friendly: 'Warm, approachable language with a personal touch',
  persuasive: 'Compelling language that drives action',
};

export async function analyzeSentence(text: string, apiKey: string, style: WritingStyle): Promise<Suggestion[]> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    const prompt = `You are a professional writing assistant. Your task is to improve the given text by making it more ${styles[style]}. 
    
Provide 3 alternative versions that maintain the core message but improve clarity and impact. Return ONLY a JSON array of objects with the following structure:
    {
      "rewrite": "the improved version",
      "style": "${style}"
    }

Text to improve: "${text}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Remove any markdown code block formatting if present
    responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

    // Try to find the first [ character and last ] character to extract just the JSON array
    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']');

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      responseText = responseText.substring(startIndex, endIndex + 1);
    }

    try {
      const suggestions = JSON.parse(responseText);

      // Validate the response structure
      if (!Array.isArray(suggestions)) {
        console.error('Response is not an array:', responseText);
        throw new Error('Invalid response format - not an array');
      }

      // Validate each suggestion object
      const validSuggestions = suggestions.filter((suggestion: any) => {
        return suggestion && typeof suggestion.rewrite === 'string' && typeof suggestion.style === 'string';
      });

      if (validSuggestions.length === 0) {
        console.error('No valid suggestions found in response:', responseText);
        throw new Error('No valid suggestions in response');
      }

      return validSuggestions;
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to parse response. Error:', errorMessage);
      console.error('Raw response text:', responseText);
      throw new Error(`Failed to parse API response: ${errorMessage}`);
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}
