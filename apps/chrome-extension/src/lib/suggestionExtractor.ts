/**
 * Suggestion Extractor Utility
 * 
 * Extracts follow-up questions from AI responses to display as clickable chips.
 * Looks for common patterns like bullet points ending with question marks.
 * 
 * @module suggestionExtractor
 */

/**
 * Extract follow-up question suggestions from AI response content
 * 
 * Patterns detected:
 * - Lines ending with '?' that start with bullets (-, *)
 * - Lines ending with '?' that start with numbers (1., 2., etc.)
 * - Questions in "Where do you want to go from here?" sections
 * 
 * @param content - The AI response text to analyze
 * @returns Array of extracted suggestion strings (max 5)
 * 
 * @example
 * ```typescript
 * const content = `Here's an explanation...
 * 
 * Where do you want to go from here?
 * - Do you want a deeper dive into superposition?
 * - Are you interested in specific applications?
 * - Would you like me to try a simpler analogy?`;
 * 
 * const suggestions = extractSuggestions(content);
 * // Returns: [
 * //   "Do you want a deeper dive into superposition?",
 * //   "Are you interested in specific applications?",
 * //   "Would you like me to try a simpler analogy?"
 * // ]
 * ```
 */
export function extractSuggestions(content: string): string[] {
  const suggestions: string[] = [];
  
  // Split content into lines
  const lines = content.split('\n');
  
  // Track if we're in the follow-up questions section
  let inFollowUpSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect "Follow-up questions:" header
    if (trimmed.toLowerCase().includes('follow-up question') || 
        trimmed.toLowerCase().includes('related question')) {
      inFollowUpSection = true;
      continue;
    }
    
    // Skip empty lines
    if (!trimmed) {
      // Empty line might end the follow-up section
      if (inFollowUpSection && suggestions.length > 0) {
        break;
      }
      continue;
    }
    
    // Check if line ends with '?'
    if (!trimmed.endsWith('?')) {
      continue;
    }
    
    // Check if line starts with bullet point or number
    const isBulletPoint = trimmed.startsWith('-') || trimmed.startsWith('*');
    const isNumberedList = /^\d+\./.test(trimmed);
    
    if (!isBulletPoint && !isNumberedList) {
      continue;
    }
    
    // Remove bullet/number prefix and clean up
    const question = trimmed
      .replace(/^[-*]/, '')  // Remove - or *
      .replace(/^\d+\./, '') // Remove numbers like 1.
      .trim();
    
    // Validate question length (reasonable range)
    if (question.length > 10 && question.length < 200) {
      suggestions.push(question);
    }
    
    // Limit to 5 suggestions
    if (suggestions.length >= 5) {
      break;
    }
  }
  
  return suggestions;
}

/**
 * Remove follow-up questions section from message content
 * Returns cleaned content without the follow-up questions
 * 
 * @param content - The AI response text
 * @returns Content with follow-up section removed
 */
export function removeFollowUpSection(content: string): string {
  const lines = content.split('\n');
  const cleanedLines: string[] = [];
  let inFollowUpSection = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect start of follow-up section
    if (trimmed.toLowerCase().includes('follow-up question') || 
        trimmed.toLowerCase().includes('related question')) {
      inFollowUpSection = true;
      continue;
    }
    
    // If in follow-up section, skip bullet/numbered questions
    if (inFollowUpSection) {
      const isBulletOrNumber = trimmed.startsWith('-') || 
                               trimmed.startsWith('*') || 
                               /^\d+\./.test(trimmed);
      
      if (isBulletOrNumber && trimmed.endsWith('?')) {
        continue; // Skip this line
      } else if (trimmed.length > 0 && !isBulletOrNumber) {
        // Non-question content, end of follow-up section
        inFollowUpSection = false;
      } else {
        continue; // Skip empty lines in follow-up section
      }
    }
    
    cleanedLines.push(line);
  }
  
  // Remove trailing empty lines
  while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
    cleanedLines.pop();
  }
  
  return cleanedLines.join('\n');
}

/**
 * Format a suggestion for display
 * Capitalizes first letter and ensures it ends with '?'
 * 
 * @param suggestion - Raw suggestion text
 * @returns Formatted suggestion
 * 
 * @example
 * ```typescript
 * formatSuggestion("do you want more details")
 * // Returns: "Do you want more details?"
 * ```
 */
export function formatSuggestion(suggestion: string): string {
  let formatted = suggestion.trim();
  
  // Capitalize first letter
  if (formatted.length > 0) {
    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }
  
  // Ensure it ends with '?'
  if (!formatted.endsWith('?')) {
    formatted += '?';
  }
  
  return formatted;
}
