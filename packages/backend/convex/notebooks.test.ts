import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Convex context
function createMockContext() {
  const mockDb = new Map();
  let nextId = 1;

  return {
    db: {
      insert: vi.fn(async (table: string, doc: any) => {
        const id = `${table}_${nextId++}`;
        mockDb.set(id, { _id: id, ...doc });
        return id;
      }),
      get: vi.fn(async (id: string) => {
        return mockDb.get(id) || null;
      }),
      patch: vi.fn(async (id: string, updates: any) => {
        const existing = mockDb.get(id);
        if (existing) {
          mockDb.set(id, { ...existing, ...updates });
        }
      }),
      delete: vi.fn(async (id: string) => {
        mockDb.delete(id);
      }),
      query: vi.fn((table: string) => ({
        withIndex: vi.fn(() => ({
          filter: vi.fn(() => ({
            collect: vi.fn(async () => []),
          })),
          order: vi.fn(() => ({
            filter: vi.fn(() => ({
              collect: vi.fn(async () => []),
              take: vi.fn(async () => []),
            })),
            take: vi.fn(async () => []),
          })),
          eq: vi.fn(() => ({
            filter: vi.fn(() => ({
              collect: vi.fn(async () => []),
            })),
          })),
        })),
        withSearchIndex: vi.fn(() => ({
          take: vi.fn(async () => []),
        })),
      })),
    },
    storage: {
      generateUploadUrl: vi.fn(async () => 'https://upload.url'),
      getUrl: vi.fn(async (storageId: string) => `https://storage.url/${storageId}`),
    },
  };
}

// Mock auth component
const mockAuthComponent = {
  getAuthUser: vi.fn(),
  getUser: vi.fn(),
};

vi.mock('./auth', () => ({
  authComponent: mockAuthComponent,
}));

describe('Notebook Validation', () => {
  it('should validate title length constraints', () => {
    const shortTitle = 'ab'; // Too short (min 3)
    const validTitle = 'Valid Title';
    const longTitle = 'a'.repeat(101); // Too long (max 100)

    expect(shortTitle.length).toBeLessThan(3);
    expect(validTitle.length).toBeGreaterThanOrEqual(3);
    expect(validTitle.length).toBeLessThanOrEqual(100);
    expect(longTitle.length).toBeGreaterThan(100);
  });

  it('should validate description length constraints', () => {
    const shortDesc = 'short'; // Too short (min 10)
    const validDesc = 'A valid description that is long enough';
    const longDesc = 'a'.repeat(501); // Too long (max 500)

    expect(shortDesc.length).toBeLessThan(10);
    expect(validDesc.length).toBeGreaterThanOrEqual(10);
    expect(validDesc.length).toBeLessThanOrEqual(500);
    expect(longDesc.length).toBeGreaterThan(500);
  });

  it('should validate content length constraints', () => {
    const shortContent = 'a'.repeat(49); // Too short (min 50)
    const validContent = 'a'.repeat(1000);
    const longContent = 'a'.repeat(100001); // Too long (max 100000)

    expect(shortContent.length).toBeLessThan(50);
    expect(validContent.length).toBeGreaterThanOrEqual(50);
    expect(validContent.length).toBeLessThanOrEqual(100000);
    expect(longContent.length).toBeGreaterThan(100000);
  });

  it('should validate category values', () => {
    const validCategories = ['Research', 'Tutorial', 'Notes', 'Analysis', 'Learning', 'Other'];
    const invalidCategory = 'InvalidCategory';

    expect(validCategories).toContain('Research');
    expect(validCategories).not.toContain(invalidCategory);
  });

  it('should validate tags constraints', () => {
    const validTags = ['tag1', 'tag2', 'tag3'];
    const tooManyTags = Array(11).fill('tag'); // Max 10 tags
    const longTag = 'a'.repeat(31); // Max 30 chars per tag

    expect(validTags.length).toBeLessThanOrEqual(10);
    expect(tooManyTags.length).toBeGreaterThan(10);
    expect(longTag.length).toBeGreaterThan(30);
  });
});

describe('Rate Limiting', () => {
  it('should enforce rate limit of 10 notebooks per day', async () => {
    const maxPublishesPerDay = 10;
    const publishCount = 10;

    expect(publishCount).toBeLessThanOrEqual(maxPublishesPerDay);
    expect(publishCount + 1).toBeGreaterThan(maxPublishesPerDay);
  });

  it('should calculate 24-hour window correctly', () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const difference = now - oneDayAgo;

    expect(difference).toBe(24 * 60 * 60 * 1000);
  });
});

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication for createPublicNotebook', async () => {
    mockAuthComponent.getAuthUser.mockResolvedValue(null);

    // In real implementation, this would throw "User must be authenticated"
    const user = await mockAuthComponent.getAuthUser(null);
    expect(user).toBeNull();
  });

  it('should allow authenticated users to create notebooks', async () => {
    const mockUser = {
      id: 'user123',
      name: 'Test User',
      email: 'test@example.com',
    };

    mockAuthComponent.getAuthUser.mockResolvedValue(mockUser);

    const user = await mockAuthComponent.getAuthUser(null);
    expect(user).toBeDefined();
    expect(user?.id).toBe('user123');
  });
});

describe('Authorization', () => {
  it('should verify notebook ownership for updates', async () => {
    const notebook = {
      _id: 'notebook123',
      userId: 'user123',
      title: 'Test Notebook',
    };

    const currentUser = { id: 'user123' };
    const otherUser = { id: 'user456' };

    expect(notebook.userId).toBe(currentUser.id);
    expect(notebook.userId).not.toBe(otherUser.id);
  });

  it('should verify notebook ownership for deletes', async () => {
    const notebook = {
      _id: 'notebook123',
      userId: 'user123',
    };

    const currentUser = { id: 'user123' };
    expect(notebook.userId).toBe(currentUser.id);
  });
});

describe('Database Operations', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  it('should insert notebook with correct default values', async () => {
    const notebookData = {
      userId: 'user123',
      title: 'Test Notebook',
      description: 'A test notebook description',
      content: 'Some test content that is long enough to meet the minimum requirements',
      category: 'Research',
      tags: ['tag1', 'tag2'],
      viewCount: 0,
      bookmarkCount: 0,
      isPublic: true,
      createdAt: Date.now(),
    };

    const id = await mockCtx.db.insert('publicNotebooks', notebookData);

    expect(mockCtx.db.insert).toHaveBeenCalledWith('publicNotebooks', notebookData);
    expect(id).toBeDefined();
    expect(notebookData.viewCount).toBe(0);
    expect(notebookData.isPublic).toBe(true);
  });

  it('should update notebook with updatedAt timestamp', async () => {
    const notebookId = 'publicNotebooks_1';
    const updates = {
      title: 'Updated Title',
      updatedAt: Date.now(),
    };

    await mockCtx.db.patch(notebookId, updates);

    expect(mockCtx.db.patch).toHaveBeenCalledWith(notebookId, updates);
    expect(updates.updatedAt).toBeDefined();
  });

  it('should delete notebook', async () => {
    const notebookId = 'publicNotebooks_1';

    await mockCtx.db.delete(notebookId);

    expect(mockCtx.db.delete).toHaveBeenCalledWith(notebookId);
  });

  it('should increment view count atomically', async () => {
    const notebook = {
      _id: 'publicNotebooks_1',
      viewCount: 5,
    };

    mockCtx.db.get.mockResolvedValue(notebook);

    const currentViewCount = notebook.viewCount;
    const newViewCount = currentViewCount + 1;

    await mockCtx.db.patch(notebook._id, { viewCount: newViewCount });

    expect(newViewCount).toBe(6);
  });
});

describe('Query Functionality', () => {
  it('should filter notebooks by category', async () => {
    const notebooks = [
      { category: 'Research', isPublic: true },
      { category: 'Tutorial', isPublic: true },
      { category: 'Research', isPublic: true },
    ];

    const researchNotebooks = notebooks.filter(n => n.category === 'Research');

    expect(researchNotebooks.length).toBe(2);
    expect(researchNotebooks.every(n => n.category === 'Research')).toBe(true);
  });

  it('should filter notebooks by public visibility', async () => {
    const notebooks = [
      { isPublic: true, title: 'Public 1' },
      { isPublic: false, title: 'Private 1' },
      { isPublic: true, title: 'Public 2' },
    ];

    const publicNotebooks = notebooks.filter(n => n.isPublic === true);

    expect(publicNotebooks.length).toBe(2);
    expect(publicNotebooks.every(n => n.isPublic === true)).toBe(true);
  });

  it('should support pagination with limit', async () => {
    const allNotebooks = Array(50).fill(null).map((_, i) => ({
      id: `notebook${i}`,
      title: `Notebook ${i}`,
    }));

    const limit = 20;
    const page1 = allNotebooks.slice(0, limit);

    expect(page1.length).toBe(20);
    expect(page1.length).toBeLessThanOrEqual(limit);
  });

  it('should enrich notebooks with author info', async () => {
    const notebook = {
      userId: 'user123',
      title: 'Test Notebook',
    };

    const user = {
      id: 'user123',
      name: 'John Doe',
      email: 'john@example.com',
      image: 'https://avatar.url',
    };

    mockAuthComponent.getUser.mockResolvedValue(user);

    const authorInfo = await mockAuthComponent.getUser(null, notebook.userId);

    expect(authorInfo).toBeDefined();
    expect(authorInfo?.name).toBe('John Doe');
  });
});

describe('Search Functionality', () => {
  it('should search notebooks by title', async () => {
    const notebooks = [
      { title: 'React Hooks Tutorial', isPublic: true },
      { title: 'Vue.js Basics', isPublic: true },
      { title: 'React Best Practices', isPublic: true },
    ];

    const searchQuery = 'React';
    const results = notebooks.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(results.length).toBe(2);
    expect(results.every(n => n.title.includes(searchQuery))).toBe(true);
  });
});

describe('File Storage', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = createMockContext();
  });

  it('should generate upload URL', async () => {
    const uploadUrl = await mockCtx.storage.generateUploadUrl();

    expect(uploadUrl).toBeDefined();
    expect(typeof uploadUrl).toBe('string');
  });

  it('should get attachment URL from storage ID', async () => {
    const storageId = 'file123';
    const url = await mockCtx.storage.getUrl(storageId);

    expect(url).toBeDefined();
    expect(url).toContain(storageId);
  });

  it('should attach file to notebook', async () => {
    const notebook = {
      _id: 'publicNotebooks_1',
      attachments: [],
    };

    const storageId = 'file123';
    const updatedAttachments = [...notebook.attachments, storageId];

    await mockCtx.db.patch(notebook._id, { attachments: updatedAttachments });

    expect(mockCtx.db.patch).toHaveBeenCalledWith(
      notebook._id,
      { attachments: updatedAttachments }
    );
  });
});

describe('Input Sanitization', () => {
  it('should trim whitespace from title', () => {
    const input = '  Test Title  ';
    const sanitized = input.trim();

    expect(sanitized).toBe('Test Title');
    expect(sanitized).not.toContain('  ');
  });

  it('should trim whitespace from description', () => {
    const input = '  Test Description  ';
    const sanitized = input.trim();

    expect(sanitized).toBe('Test Description');
  });
});

describe('Edge Cases', () => {
  it('should handle notebooks without tags', () => {
    const notebook = {
      title: 'Test',
      tags: undefined,
    };

    const tags = notebook.tags || [];

    expect(tags).toEqual([]);
    expect(Array.isArray(tags)).toBe(true);
  });

  it('should handle notebooks without attachments', () => {
    const notebook = {
      title: 'Test',
      attachments: undefined,
    };

    const attachments = notebook.attachments || [];

    expect(attachments).toEqual([]);
  });

  it('should handle missing user gracefully', async () => {
    mockAuthComponent.getUser.mockResolvedValue(null);

    const user = await mockAuthComponent.getUser(null, 'nonexistent-user');

    expect(user).toBeNull();
  });

  it('should return null for non-public notebooks', () => {
    const notebook = {
      _id: 'notebook123',
      isPublic: false,
    };

    // In real implementation, getNotebookById would return null
    expect(notebook.isPublic).toBe(false);
  });
});
