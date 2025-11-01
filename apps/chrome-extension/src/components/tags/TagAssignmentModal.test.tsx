import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagAssignmentModal } from './TagAssignmentModal';
import { useFolderStore } from '../../stores/useFolderStore';
import type { Tag, NotebookMetadata } from '../../types/folder';

vi.mock('../../stores/useFolderStore');
vi.mock('./TagAutocomplete', () => ({
  TagAutocomplete: ({ value, onChange, placeholder }: any) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid="tag-search"
    />
  ),
}));

const mockTags: Tag[] = [
  { id: 't1', name: 'Python', color: '#3b82f6', count: 5 },
  { id: 't2', name: 'JavaScript', color: '#f59e0b', count: 3 },
  { id: 't3', name: 'Machine Learning', color: '#8b5cf6', count: 8 },
  { id: 't4', name: 'React', color: '#10b981', count: 2 },
];

describe('TagAssignmentModal', () => {
  const mockAssignTag = vi.fn();
  const mockRemoveTag = vi.fn();
  const mockOnClose = vi.fn();

  const mockMetadata: NotebookMetadata = {
    notebookId: 'nb1',
    folderIds: [],
    tagIds: ['t1'],
    lastUpdatedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: mockTags,
        assignTag: mockAssignTag,
        removeTag: mockRemoveTag,
      };
      return selector ? selector(state) : state;
    });
  });

  it('should render modal with title', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Manage Tags')).toBeInTheDocument();
  });

  it('should display all available tags', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Machine Learning')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('should show currently assigned tags as checked', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const pythonCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('Python')
    );

    expect(pythonCheckbox).toBeChecked();
  });

  it('should toggle tag selection', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const reactCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('React')
    );

    expect(reactCheckbox).not.toBeChecked();

    fireEvent.click(reactCheckbox!);

    expect(reactCheckbox).toBeChecked();
  });

  it('should filter tags by search query', async () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByTestId('tag-search');
    fireEvent.change(searchInput, { target: { value: 'script' } });

    await waitFor(() => {
      expect(screen.getByText('JavaScript')).toBeInTheDocument();
      expect(screen.queryByText('Python')).not.toBeInTheDocument();
    });
  });

  it('should show error when exceeding max tags limit', async () => {
    const fullMetadata: NotebookMetadata = {
      notebookId: 'nb1',
      folderIds: [],
      tagIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
      lastUpdatedAt: Date.now(),
    };

    const extraTags: Tag[] = [
      ...mockTags,
      { id: 't5', name: 'Tag5', color: '#ef4444', count: 1 },
      { id: 't6', name: 'Tag6', color: '#ef4444', count: 1 },
      { id: 't7', name: 'Tag7', color: '#ef4444', count: 1 },
      { id: 't8', name: 'Tag8', color: '#ef4444', count: 1 },
      { id: 't9', name: 'Tag9', color: '#ef4444', count: 1 },
      { id: 't10', name: 'Tag10', color: '#ef4444', count: 1 },
      { id: 't11', name: 'Tag11', color: '#ef4444', count: 1 },
    ];

    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: extraTags,
        assignTag: mockAssignTag,
        removeTag: mockRemoveTag,
      };
      return selector ? selector(state) : state;
    });

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={fullMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const tag11Checkbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('Tag11')
    );

    fireEvent.click(tag11Checkbox!);

    await waitFor(() => {
      expect(screen.getByText('Maximum 10 tags per notebook')).toBeInTheDocument();
    });
  });

  it('should call assignTag for newly selected tags', async () => {
    mockAssignTag.mockResolvedValue({});

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const reactCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('React')
    );

    fireEvent.click(reactCheckbox!);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAssignTag).toHaveBeenCalledWith('nb1', 't4');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should call removeTag for deselected tags', async () => {
    mockRemoveTag.mockResolvedValue({});

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const pythonCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('Python')
    );

    fireEvent.click(pythonCheckbox!);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockRemoveTag).toHaveBeenCalledWith('nb1', 't1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should display tag counts', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('(5)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('should show selected tag counter', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('1 / 10 tags selected')).toBeInTheDocument();
  });

  it('should update counter when tags are selected', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const reactCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('React')
    );

    fireEvent.click(reactCheckbox!);

    expect(screen.getByText('2 / 10 tags selected')).toBeInTheDocument();
  });

  it('should close modal on cancel', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnClose).toHaveBeenCalled();
    expect(mockAssignTag).not.toHaveBeenCalled();
  });

  it('should close modal on backdrop click', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const backdrop = document.querySelector('.snlm-tag-assignment-modal');
    fireEvent.click(backdrop!);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal on X button click', () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show empty state when no tags exist', () => {
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: [],
        assignTag: mockAssignTag,
        removeTag: mockRemoveTag,
      };
      return selector ? selector(state) : state;
    });

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('No tags yet. Create one first!')).toBeInTheDocument();
  });

  it('should show no results message for search with no matches', async () => {
    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const searchInput = screen.getByTestId('tag-search');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    await waitFor(() => {
      expect(screen.getByText('No tags found matching your search.')).toBeInTheDocument();
    });
  });

  it('should handle save errors gracefully', async () => {
    mockAssignTag.mockRejectedValue(new Error('Failed to assign tag'));

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={mockMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const reactCheckbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('React')
    );

    fireEvent.click(reactCheckbox!);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to assign tag')).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should disable checkboxes when max limit reached', () => {
    const fullMetadata: NotebookMetadata = {
      notebookId: 'nb1',
      folderIds: [],
      tagIds: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
      lastUpdatedAt: Date.now(),
    };

    const extraTags: Tag[] = [
      ...mockTags,
      { id: 't5', name: 'Tag5', color: '#ef4444', count: 1 },
      { id: 't6', name: 'Tag6', color: '#ef4444', count: 1 },
      { id: 't7', name: 'Tag7', color: '#ef4444', count: 1 },
      { id: 't8', name: 'Tag8', color: '#ef4444', count: 1 },
      { id: 't9', name: 'Tag9', color: '#ef4444', count: 1 },
      { id: 't10', name: 'Tag10', color: '#ef4444', count: 1 },
      { id: 't11', name: 'Tag11', color: '#ef4444', count: 1 },
    ];

    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        tags: extraTags,
        assignTag: mockAssignTag,
        removeTag: mockRemoveTag,
      };
      return selector ? selector(state) : state;
    });

    render(
      <TagAssignmentModal
        notebookId="nb1"
        metadata={fullMetadata}
        onClose={mockOnClose}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    const tag11Checkbox = checkboxes.find((cb) =>
      cb.closest('label')?.textContent?.includes('Tag11')
    );

    expect(tag11Checkbox).toBeDisabled();
  });
});
