/**
 * DirectoryTab Component Tests
 * Story 4.3: Directory Tab UI - Task 12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// Create mock functions using vi.hoisted
const { mockUseQuery, mockUseMutation, mockUseDirectoryStore } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseMutation: vi.fn(),
  mockUseDirectoryStore: vi.fn(),
}));

// Mock Convex hooks
vi.mock('convex/react', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
}));

// Mock store
vi.mock('@/src/stores/useDirectoryStore', () => ({
  useDirectoryStore: mockUseDirectoryStore,
}));

// Import component after mocks
import { DirectoryTab } from './DirectoryTab';

// Mock child components
vi.mock('@/src/components/directory/NotebookGrid', () => ({
  NotebookGrid: ({ notebooks, isLoading, hasMore, onNotebookClick, onLoadMore }: any) => (
    <div data-testid="notebook-grid">
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {notebooks?.map((notebook: any) => (
            <div
              key={notebook._id}
              data-testid="notebook-card"
              onClick={() => onNotebookClick(notebook)}
            >
              {notebook.title}
            </div>
          ))}
          {hasMore && onLoadMore && (
            <button data-testid="load-more" onClick={onLoadMore}>
              Load More
            </button>
          )}
        </>
      )}
    </div>
  ),
}));

vi.mock('@/src/components/directory/CategoryFilter', () => ({
  CategoryFilter: ({ selected, onSelect }: any) => (
    <div data-testid="category-filter">
      <button onClick={() => onSelect('Research')}>Research</button>
      <span>{selected}</span>
    </div>
  ),
}));

vi.mock('@/src/components/directory/SortDropdown', () => ({
  SortDropdown: ({ value, onChange }: any) => (
    <div data-testid="sort-dropdown">
      <button onClick={() => onChange('popular')}>Popular</button>
      <span>{value}</span>
    </div>
  ),
}));

vi.mock('@/src/components/directory/SearchInput', () => ({
  SearchInput: ({ value, onChange }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/src/components/directory/NotebookDetailModal', () => ({
  NotebookDetailModal: ({ notebook, isOpen, onClose }: any) => (
    isOpen ? (
      <div data-testid="detail-modal">
        <h2>{notebook?.title}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}));

describe('DirectoryTab', () => {
  const mockStoreState = {
    category: 'All',
    sortBy: 'recent' as const,
    searchQuery: '',
    selectedNotebook: null,
    setCategory: vi.fn(),
    setSort: vi.fn(),
    setSearch: vi.fn(),
    selectNotebook: vi.fn(),
    reset: vi.fn(),
  };

  const mockNotebooks = [
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

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });
    mockUseDirectoryStore.mockReturnValue(mockStoreState);
  });

  it('should render directory tab with header', () => {
    render(<DirectoryTab />);

    expect(screen.getByText('Public Directory')).toBeInTheDocument();
  });

  it('should display loading state while fetching notebooks', () => {
    mockUseQuery.mockReturnValue(undefined);

    render(<DirectoryTab />);

    expect(screen.getByTestId('notebook-grid')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display notebooks when loaded', () => {
    render(<DirectoryTab />);

    expect(screen.getAllByTestId('notebook-card')).toHaveLength(2);
    expect(screen.getByText('Test Notebook 1')).toBeInTheDocument();
    expect(screen.getByText('Test Notebook 2')).toBeInTheDocument();
  });

  it('should call setCategory when category filter changes', async () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });

    render(<DirectoryTab />);

    const categoryButton = screen.getByText('Research');
    await userEvent.click(categoryButton);

    expect(mockStoreState.setCategory).toHaveBeenCalledWith('Research');
  });

  it('should call setSort when sort dropdown changes', async () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });

    render(<DirectoryTab />);

    const sortButton = screen.getByText('Popular');
    await userEvent.click(sortButton);

    expect(mockStoreState.setSort).toHaveBeenCalledWith('popular');
  });

  it('should call setSearch when search input changes', async () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });

    render(<DirectoryTab />);

    const searchInput = screen.getByTestId('search-input');
    await userEvent.type(searchInput, 'test query');

    await waitFor(() => {
      expect(mockStoreState.setSearch).toHaveBeenCalled();
    });
  });

  it('should open detail modal when notebook is clicked', async () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });

    render(<DirectoryTab />);

    const notebookCard = screen.getAllByTestId('notebook-card')[0];
    await userEvent.click(notebookCard);

    expect(mockStoreState.selectNotebook).toHaveBeenCalledWith(mockNotebooks[0]);
  });

  it('should use search query when search is active', () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });
    mockUseDirectoryStore.mockReturnValue({
      ...mockStoreState,
      searchQuery: 'test',
    });

    render(<DirectoryTab />);

    // Verify that searchPublicNotebooks API is called with searchQuery
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(), // API function
      expect.objectContaining({
        searchQuery: 'test',
      })
    );
  });

  it('should hide sort dropdown when search is active', () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });
    mockUseDirectoryStore.mockReturnValue({
      ...mockStoreState,
      searchQuery: 'test',
    });

    render(<DirectoryTab />);

    // Sort dropdown should still be in DOM but might be conditionally rendered
    // This tests the conditional rendering logic
    const sortDropdown = screen.queryByTestId('sort-dropdown');
    // When searchQuery is present, sort dropdown should not be rendered
    expect(sortDropdown).not.toBeInTheDocument();
  });

  it('should show detail modal when selectedNotebook is set', () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });
    mockUseDirectoryStore.mockReturnValue({
      ...mockStoreState,
      selectedNotebook: mockNotebooks[0],
    });

    render(<DirectoryTab />);

    expect(screen.getByTestId('detail-modal')).toBeInTheDocument();
    // Use getAllByText and verify there are multiple instances (card + modal)
    const instances = screen.getAllByText('Test Notebook 1');
    expect(instances.length).toBeGreaterThanOrEqual(2);
  });

  it('should close detail modal when close button is clicked', async () => {
    mockUseQuery.mockReturnValue({ notebooks: mockNotebooks, hasMore: false });
    mockUseDirectoryStore.mockReturnValue({
      ...mockStoreState,
      selectedNotebook: mockNotebooks[0],
    });

    render(<DirectoryTab />);

    const closeButton = screen.getByText('Close');
    await userEvent.click(closeButton);

    expect(mockStoreState.selectNotebook).toHaveBeenCalledWith(null);
  });
});
