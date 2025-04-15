import { GoogleGenerativeAI } from '@google/generative-ai';
import { Suggestion, WritingStyle } from '../types/suggestion';

const styles = {
  casual: 'Casual, friendly, human like, everyday language with contractions and simple words',
  proofread:
    'Proofread the text for any errors and make sure it is grammatically correct. Do not change the meaning of the text.',
  professional: "Business-appropriate language that's clear and direct",
  persuasive: 'Compelling language that drives action',
  freestyle: '', // Custom instructions will be provided at runtime
};

export async function analyzeSentence(
  text: string,
  apiKey: string,
  style: WritingStyle,
  customInstruction?: string,
): Promise<Suggestion[]> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: style === 'proofread' ? 0.1 : 0.7,
        topP: style === 'proofread' ? 0.5 : 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
    });

    const formatInstructions = `
    Format the response in clean HTML without any markdown or code blocks. Use these HTML tags:
    - <p> for paragraphs
    - <b> for important points or emphasis
    - <i> for subtle emphasis or terms
    - <ul> and <li> for lists
    
    Note: Do not add signatures.`;

    const basePrompt =
      style === 'freestyle'
        ? `You are a helpful writing assistant. The user has provided some text and instructions for how to help with it.
         
         Instructions: ${customInstruction}
         
         ${formatInstructions}
         
         Text: "${text}"
         
         Provide a response that follows the user's instructions. Return ONLY a JSON array with a single object using this structure:
         {
           "rewrite": "your HTML formatted response",
           "style": "freestyle"
         }`
        : style === 'proofread'
          ? `You are a professional proofreader. Review the text for grammar, spelling, and punctuation errors only.
         Make minimal changes to fix these errors while preserving the exact meaning, tone, and style of the original text.
         If the text is already correct, return it unchanged.
         
         ${formatInstructions}
         
         Return ONLY a JSON array with this structure:
         [
           {
             "rewrite": "the HTML formatted corrected version",
             "style": "proofread"
           }
         ]
         
         Text to proofread: "${text}"`
          : `You are a professional writing assistant. Your task is to improve the given text by making it more ${styles[style]}. 
         
         ${formatInstructions}
         
         Provide 3 alternative versions that maintain the core message but improve clarity and impact. Return ONLY a JSON array of objects with the following structure:
         {
           "rewrite": "the HTML formatted improved version",
           "style": "${style}"
         }
         
         Text to improve: "${text}"`;

    const result = await model.generateContent(basePrompt);
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

      // If it's a single object for proofread, convert it to an array
      const suggestionsArray = Array.isArray(suggestions) ? suggestions : [suggestions];

      // Validate each suggestion object and clean up HTML
      const validSuggestions = suggestionsArray
        .filter((suggestion: any) => {
          return suggestion && typeof suggestion.rewrite === 'string' && typeof suggestion.style === 'string';
        })
        .map((suggestion: any) => ({
          ...suggestion,
          rewrite: suggestion.rewrite
            .trim()
            // Sanitize the HTML to only allow specific tags
            .replace(/<(?!\/?(b|i|ul|li|p)(?=>|\s.*>))\/?(?:.|\s)*?>/g, '')
            // Add some spacing for lists
            .replace(/<ul>/g, '<ul class="list-disc pl-4 my-2">')
            .replace(/<li>/g, '<li class="mb-1">')
            // Add spacing for paragraphs
            .replace(/<p>/g, '<p class="mb-3">'),
        }));

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
