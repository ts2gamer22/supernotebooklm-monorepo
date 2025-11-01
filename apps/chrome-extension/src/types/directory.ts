/**
 * Types for Public Directory (Epic 4)
 * Story 4.3: Directory Tab UI
 */

// Category options for notebooks
export const CATEGORIES = [
  'All',
  'Research',
  'Tutorial',
  'Notes',
  'Analysis',
  'Learning',
  'Other',
] as const;

export type Category = typeof CATEGORIES[number];

// Sort options for directory
export type SortBy = 'recent' | 'popular' | 'trending';

// Public notebook from Convex
export interface PublicNotebook {
  _id: string;
  _creationTime: number;
  userId: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  viewCount: number;
  bookmarkCount?: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt?: number;
  attachments?: string[];
}

// Author info (will be fetched separately via Better Auth in future stories)
export interface NotebookAuthor {
  userId: string;
  name: string;
  email?: string;
  avatar?: string;
}

// Notebook with author details for UI display
export interface PublicNotebookWithAuthor extends PublicNotebook {
  author?: NotebookAuthor;
}

// Query response from Convex
export interface NotebooksQueryResponse {
  notebooks: PublicNotebook[];
  hasMore?: boolean;
  cursor?: string;
}

// Search query response
export interface SearchQueryResponse {
  notebooks: PublicNotebook[];
}
