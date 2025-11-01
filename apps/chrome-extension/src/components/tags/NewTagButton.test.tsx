import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NewTagButton } from './NewTagButton';
import { useFolderStore } from '../../stores/useFolderStore';

vi.mock('../../stores/useFolderStore');
vi.mock('../folders/ColorPicker', () => ({
  ColorPicker: ({ onSelect }: { onSelect: (color: string) => void }) => (
    <div data-testid="color-picker">
      <button onClick={() => onSelect('#3b82f6')} aria-label="Use blue folder color">
        Blue
      </button>
    </div>
  ),
  FOLDER_COLOR_OPTIONS: [
    { name: 'blue', value: '#3b82f6' },
    { name: 'purple', value: '#8b5cf6' },
  ],
}));

describe('NewTagButton', () => {
  const mockCreateTag = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        createTag: mockCreateTag,
        tags: [],
      };
      return selector ? selector(state) : state;
    });
  });

  it('should render New Tag button when closed', () => {
    render(<NewTagButton />);

    expect(screen.getByText('New Tag')).toBeInTheDocument();
    expect(screen.getByLabelText('Create new tag')).toBeInTheDocument();
  });

  it('should open form when button clicked', () => {
    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    expect(screen.getByPlaceholderText('Tag name')).toBeInTheDocument();
    expect(screen.getByTestId('color-picker')).toBeInTheDocument();
  });

  it('should create tag with valid input', async () => {
    mockCreateTag.mockResolvedValue({ id: 't1', name: 'Test', color: '#3b82f6', count: 0 });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));
    
    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'Test Tag' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith('Test Tag', '#3b82f6');
    });
  });

  it('should show error when tag name is empty', async () => {
    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tag name is required')).toBeInTheDocument();
    });

    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it('should show error when tag name exceeds max length', async () => {
    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const longName = 'a'.repeat(31);
    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: longName } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tag name must be 30 characters or less')).toBeInTheDocument();
    });

    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it('should show error when tag name is duplicate', async () => {
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        createTag: mockCreateTag,
        tags: [{ id: 't1', name: 'Existing', color: '#3b82f6', count: 1 }],
      };
      return selector ? selector(state) : state;
    });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'Existing' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tag already exists')).toBeInTheDocument();
    });

    expect(mockCreateTag).not.toHaveBeenCalled();
  });

  it('should be case-insensitive for duplicate check', async () => {
    vi.mocked(useFolderStore).mockImplementation((selector: any) => {
      const state = {
        createTag: mockCreateTag,
        tags: [{ id: 't1', name: 'Python', color: '#3b82f6', count: 1 }],
      };
      return selector ? selector(state) : state;
    });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'python' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tag already exists')).toBeInTheDocument();
    });
  });

  it('should close form when cancel clicked', () => {
    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));
    expect(screen.getByPlaceholderText('Tag name')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cancel'));
    expect(screen.queryByPlaceholderText('Tag name')).not.toBeInTheDocument();
  });

  it('should allow color selection', async () => {
    mockCreateTag.mockResolvedValue({ id: 't1', name: 'Test', color: '#3b82f6', count: 0 });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'Test' } });

    fireEvent.click(screen.getByText('Blue'));

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith('Test', '#3b82f6');
    });
  });

  it('should reset form after successful creation', async () => {
    mockCreateTag.mockResolvedValue({ id: 't1', name: 'Test', color: '#3b82f6', count: 0 });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'Test' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Tag name')).not.toBeInTheDocument();
    });
  });

  it('should handle creation error', async () => {
    mockCreateTag.mockRejectedValue(new Error('Failed to save'));

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: 'Test' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });
  });

  it('should trim whitespace from tag name', async () => {
    mockCreateTag.mockResolvedValue({ id: 't1', name: 'Test', color: '#3b82f6', count: 0 });

    render(<NewTagButton />);

    fireEvent.click(screen.getByText('New Tag'));

    const input = screen.getByPlaceholderText('Tag name');
    fireEvent.change(input, { target: { value: '  Test  ' } });

    const submitButton = screen.getByLabelText('Create tag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTag).toHaveBeenCalledWith('Test', expect.any(String));
    });
  });
});
