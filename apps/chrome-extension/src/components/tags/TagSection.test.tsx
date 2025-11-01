import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagSection } from './TagSection';
import { useFolderStore } from '../../stores/useFolderStore';
import type { Tag } from '../../types/folder';

vi.mock('../../stores/useFolderStore');

const mockTags: Tag[] = [
  { id: 't1', name: 'Python', color: '#3b82f6', count: 12 },
  { id: 't2', name: 'Machine Learning', color: '#8b5cf6', count: 8 },
  { id: 't3', name: 'Research', color: '#10b981', count: 5 },
];

describe('TagSection', () => {
  const mockLoadFolders = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: mockTags,
        loadFolders: mockLoadFolders,
        isLoading: false,
      };
      return selector ? selector(state) : state;
    });
  });

  it('should render tag list with counts', () => {
    render(<TagSection />);

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('should display tag count in header', () => {
    render(<TagSection />);

    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('should show empty state when no tags', () => {
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: [],
        loadFolders: mockLoadFolders,
        isLoading: false,
      };
      return selector ? selector(state) : state;
    });

    render(<TagSection />);

    expect(screen.getByText('No tags yet. Create one to get started!')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: [],
        loadFolders: mockLoadFolders,
        isLoading: true,
      };
      return selector ? selector(state) : state;
    });

    render(<TagSection />);

    const loadingElements = document.querySelectorAll('.snlm-tag-section__skeleton');
    expect(loadingElements).toHaveLength(2);
  });

  it('should call loadFolders on mount', () => {
    render(<TagSection />);

    expect(mockLoadFolders).toHaveBeenCalledTimes(1);
  });

  it('should render New Tag button', () => {
    render(<TagSection />);

    expect(screen.getByText('New Tag')).toBeInTheDocument();
  });

  it('should display Tags heading with icon', () => {
    render(<TagSection />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tags');
  });

  it('should render all tags when multiple exist', () => {
    render(<TagSection />);

    const tagButtons = screen.getAllByRole('button').filter(btn => 
      btn.textContent?.includes('Python') || 
      btn.textContent?.includes('Machine Learning') || 
      btn.textContent?.includes('Research')
    );

    expect(tagButtons).toHaveLength(3);
  });
});
