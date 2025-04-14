import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ResponseType {
  type: string;
  description: string;
  style?: string;
}

export async function analyzeEmailThread(thread: string, apiKey: string): Promise<ResponseType[]> {
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

    console.log('Analyzing email thread:', thread);

    const prompt = `You are an email assistant. Analyze the following email thread and suggest possible types of responses that would be appropriate. Consider the context, tone, and content of the conversation.

    You must respond with ONLY a JSON array of objects. Do not include any other text or explanation.
    The response must be valid JSON that can be parsed, with this exact structure:
    [
      {
        "type": "brief name of response type",
        "description": "short description of what this response would entail"
      }
    ]

    Limit to 3-4 most relevant response types. Here is the email thread to analyze:

    ${thread}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let responseText = response.text();

    // Remove any markdown code block formatting if present
    responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();

    // Try to find the first [ character and last ] character to extract just the JSON array
    const startIndex = responseText.indexOf('[');
    const endIndex = responseText.lastIndexOf(']');

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      console.error('Invalid JSON structure in response:', responseText);
      throw new Error('Response is not in the expected JSON format');
    }

    responseText = responseText.substring(startIndex, endIndex + 1);

    try {
      const suggestions = JSON.parse(responseText);

      // Validate the response structure
      if (!Array.isArray(suggestions)) {
        console.error('Response is not an array:', responseText);
        throw new Error('Invalid response format - not an array');
      }

      // Validate each suggestion object
      const validSuggestions = suggestions.filter((suggestion: any) => {
        return suggestion && typeof suggestion.type === 'string' && typeof suggestion.description === 'string';
      });

      if (validSuggestions.length === 0) {
        console.error('No valid suggestions found in response:', responseText);
        throw new Error('No valid suggestions in response');
      }
      console.log('Valid suggestions:', validSuggestions);
      return validSuggestions;
    } catch (error) {
      console.error('Failed to parse response:', error);
      console.error('Raw response text:', responseText);
      throw new Error('Failed to parse API response');
    }
  } catch (error) {
    console.error('Error analyzing email thread:', error);
    throw error;
  }
}

export async function generateEmailResponse(
  thread: string,
  responseType: ResponseType,
  apiKey: string,
): Promise<string> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });

    const styleInstructions = {
      professional: 'Use a formal and business-appropriate tone. Be polite and maintain professional distance.',
      casual: 'Casual, friendly, human like, everyday language with contractions and simple words',
      friendly: 'Use a warm and approachable tone. Be personable while maintaining professionalism.',
      concise: 'Be brief and to-the-point. Focus on essential information without unnecessary details.',
      detailed: 'Provide comprehensive information. Include relevant details and thorough explanations.',
    }[responseType.style || 'professional'];

    const prompt = `You are an email assistant. Generate a response to the following email thread. The response should be a ${responseType.type} type response, which means: ${responseType.description}

    Style Instructions: ${styleInstructions}

    Keep the response relevant and maintain appropriate tone based on the conversation history.
    
    Format the response in clean HTML without any markdown or code blocks. Use these HTML tags:
    - <p> for paragraphs
    - <b> for important points or emphasis
    - <i> for subtle emphasis or terms
    - <ul> and <li> for lists
    - <br> for line breaks

    Note: Do not add signatures.

    Email thread:
    ${thread}

    Return ONLY the formatted HTML response without any code blocks or backticks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    // Clean up any potential code block markers
    return response
      .text()
      .trim()
      .replace(/```html\n?|\n?```/g, '');
  } catch (error) {
    console.error('Error generating email response:', error);
    throw error;
  }
}
