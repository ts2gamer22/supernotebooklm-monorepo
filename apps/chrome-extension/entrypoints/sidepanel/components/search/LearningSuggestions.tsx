/**
 * Learning Suggestions Component
 * AI-generated follow-up questions based on search results
 */

import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Loader2 } from 'lucide-react';
import { createSession, destroySession } from '../../../../src/lib/promptApi';
import type { AISession } from '../../../../src/types/ai';
import type { SearchResult } from '../../../../src/types/search';

interface LearningSuggestionsProps {
  query: string;
  results: SearchResult[];
  onSuggestionClick: (suggestion: string) => void;
}

/**
 * Generate suggestions using AI
 */
async function generateSuggestions(
  query: string,
  results: SearchResult[]
): Promise<string[]> {
  let session: AISession | null = null;
  
  try {
    // Create temporary session
    const result = await createSession({
      systemPrompt: 'You are a learning assistant that generates insightful follow-up questions.',
      outputLanguage: 'en',
    });
    
    if (!result.success || !result.session) {
      throw new Error('Failed to create AI session');
    }
    
    session = result.session;
    
    // Build context from search results
    const context = results
      .slice(0, 3) // Use top 3 results
      .map(r => r.snippet)
      .join('\n\n');
    
    // Prompt for suggestions
    const prompt = `User searched for: "${query}"

Search results context:
${context}

Based on this search query and results, generate 3-5 insightful follow-up questions that would help the user explore this topic deeper.

Format your response EXACTLY as a simple list, one question per line, each ending with a question mark:
- Question 1?
- Question 2?
- Question 3?

Keep questions concise (max 12 words each) and directly related to the search topic.`;
    
    const response = await session.prompt(prompt);
    
    // Parse response - extract questions
    const questions = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.match(/^\d+\./)) // Starts with - or 1.
      .map(line => line.replace(/^[-\d.]+\s*/, '').trim()) // Remove bullet/number
      .filter(line => line.endsWith('?') && line.length > 10) // Valid question
      .slice(0, 5); // Max 5 suggestions
    
    return questions.length > 0 ? questions : [
      'What are the key concepts related to this topic?',
      'How does this relate to my other research?',
      'What are practical applications of this?',
    ];
  } catch (error) {
    console.error('[LearningSuggestions] Generation failed:', error);
    
    // Fallback suggestions
    return [
      `What are the main concepts in ${query}?`,
      `How can I apply ${query} in practice?`,
      `What are recent developments in ${query}?`,
    ];
  } finally {
    if (session) {
      destroySession(session);
    }
  }
}

/**
 * Learning Suggestions Component
 */
export function LearningSuggestions({ 
  query, 
  results, 
  onSuggestionClick 
}: LearningSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  async function handleGenerate() {
    setIsLoading(true);
    try {
      const generated = await generateSuggestions(query, results);
      setSuggestions(generated);
      setHasGenerated(true);
    } catch (error) {
      console.error('[LearningSuggestions] Failed to generate:', error);
    } finally {
      setIsLoading(false);
    }
  }
  
  async function handleRefresh() {
    await handleGenerate();
  }
  
  // Auto-generate on first render if we have results
  useEffect(() => {
    if (results.length > 0 && !hasGenerated && !isLoading) {
      handleGenerate();
    }
  }, [results.length, hasGenerated, isLoading]);
  
  // Don't render if no results
  if (results.length === 0) {
    return null;
  }
  
  return (
    <div className="border-t border-nb-dark-300 pt-3 mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-nb-purple" />
          <span className="text-xs font-medium text-nb-text">Learning Suggestions</span>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-nb-dark-200 rounded transition-colors disabled:opacity-50"
            title="Refresh suggestions"
          >
            <RefreshCw
              size={12}
              className={`text-nb-text-dim ${isLoading ? 'animate-spin' : ''}`}
            />
          </button>
        )}
      </div>
      
      {/* Loading state */}
      {isLoading && suggestions.length === 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="text-nb-purple animate-spin" />
        </div>
      )}
      
      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionClick(suggestion)}
              className="px-3 py-1.5 bg-nb-purple/10 hover:bg-nb-purple/20 text-nb-purple text-xs rounded-full border border-nb-purple/30 hover:border-nb-purple/50 transition-colors text-left"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
      
      {/* Generate button (if not generated yet) */}
      {!hasGenerated && !isLoading && (
        <button
          onClick={handleGenerate}
          className="w-full px-3 py-2 bg-nb-dark-200 hover:bg-nb-dark-300 text-nb-text text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles size={14} />
          Generate Learning Suggestions
        </button>
      )}
    </div>
  );
}
