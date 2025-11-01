/**
 * NotebookGrid Component Tests
 * Story 4.3: Directory Tab UI - Task 12
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { NotebookGrid } from './NotebookGrid';
import type { PublicNotebook } from '@/src/types/directory';

// Mock NotebookCard component
vi.mock('./NotebookCard', () => ({
  NotebookCard: ({ notebook, onClick }: any) => (
    <div data-testid="notebook-card" onClick={onClick}>
      {notebook.title}
    </div>
  ),
}));

describe('NotebookGrid', () => {
  const mockNotebooks: PublicNotebook[] = [
    {
      _id: '1',
      _creationTime: Date.now(),
      userId: 'user1',
      title: 'Test Notebook 1',
      description: 'Description 1',
      content: 'Content 1',
      category: 'Research',
      tags: ['tag1'],
      viewCount: 10,
      isPublic: true,
      createdAt: Date.now(),
    },
    {
      _id: '2',
      _creationTime: Date.now(),
      userId: 'user2',
      title: 'Test Notebook 2',
      description: 'Description 2',
      content: 'Content 2',
      category: 'Tutorial',
      tags: ['tag2'],
      viewCount: 20,
      isPublic: true,
      createdAt: Date.now(),
    },
  ];

  it('should display loading state when notebooks is undefined', () => {
    const mockOnClick = vi.fn();
    render(<NotebookGrid notebooks={undefined} onNotebookClick={mockOnClick} />);

    expect(screen.getByText('Loading notebooks...')).toBeInTheDocument();
  });

  it('should display loading state when isLoading is true', () => {
    const mockOnClick = vi.fn();
    render(<NotebookGrid notebooks={[]} isLoading={true} onNotebookClick={mockOnClick} />);

    expect(screen.getByText('Loading notebooks...')).toBeInTheDocument();
  });

  it('should display empty state when no notebooks', () => {
    const mockOnClick = vi.fn();
    render(<NotebookGrid notebooks={[]} onNotebookClick={mockOnClick} />);

    expect(screen.getByText('No notebooks found')).toBeInTheDocument();
    expect(screen.getByText(/Be the first to share/i)).toBeInTheDocument();
  });

  it('should render notebook cards when notebooks are provided', () => {
    const mockOnClick = vi.fn();
    render(<NotebookGrid notebooks={mockNotebooks} onNotebookClick={mockOnClick} />);

    const cards = screen.getAllByTestId('notebook-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Test Notebook 1')).toBeInTheDocument();
    expect(screen.getByText('Test Notebook 2')).toBeInTheDocument();
  });

  it('should call onNotebookClick when a card is clicked', async () => {
    const mockOnClick = vi.fn();
    render(<NotebookGrid notebooks={mockNotebooks} onNotebookClick={mockOnClick} />);

    const firstCard = screen.getAllByTestId('notebook-card')[0];
    await userEvent.click(firstCard);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should render grid with correct responsive classes', () => {
    const mockOnClick = vi.fn();
    const { container } = render(
      <NotebookGrid notebooks={mockNotebooks} onNotebookClick={mockOnClick} />
    );

    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass('grid-cols-1');
    expect(grid).toHaveClass('sm:grid-cols-2');
  });
});
