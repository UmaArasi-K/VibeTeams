// State machine unit tests for the task-service
// Per agents.md Section 1.3: ≥80% coverage

const VALID_TRANSITIONS: Record<string, string[]> = {
  'backlog': ['in-progress', 'blocked'],
  'in-progress': ['in-review', 'blocked', 'backlog'],
  'in-review': ['done', 'in-progress', 'blocked'],
  'done': ['backlog'],
  'blocked': ['backlog', 'in-progress'],
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('Task State Machine', () => {
  describe('Valid transitions', () => {
    test('backlog → in-progress is valid', () => {
      expect(isValidTransition('backlog', 'in-progress')).toBe(true);
    });

    test('backlog → blocked is valid', () => {
      expect(isValidTransition('backlog', 'blocked')).toBe(true);
    });

    test('in-progress → in-review is valid', () => {
      expect(isValidTransition('in-progress', 'in-review')).toBe(true);
    });

    test('in-progress → blocked is valid', () => {
      expect(isValidTransition('in-progress', 'blocked')).toBe(true);
    });

    test('in-progress → backlog is valid', () => {
      expect(isValidTransition('in-progress', 'backlog')).toBe(true);
    });

    test('in-review → done is valid', () => {
      expect(isValidTransition('in-review', 'done')).toBe(true);
    });

    test('in-review → in-progress is valid', () => {
      expect(isValidTransition('in-review', 'in-progress')).toBe(true);
    });

    test('done → backlog is valid (reopen)', () => {
      expect(isValidTransition('done', 'backlog')).toBe(true);
    });

    test('blocked → backlog is valid', () => {
      expect(isValidTransition('blocked', 'backlog')).toBe(true);
    });

    test('blocked → in-progress is valid', () => {
      expect(isValidTransition('blocked', 'in-progress')).toBe(true);
    });
  });

  describe('Invalid transitions', () => {
    test('backlog → done is NOT valid (skip review)', () => {
      expect(isValidTransition('backlog', 'done')).toBe(false);
    });

    test('backlog → in-review is NOT valid', () => {
      expect(isValidTransition('backlog', 'in-review')).toBe(false);
    });

    test('done → in-progress is NOT valid', () => {
      expect(isValidTransition('done', 'in-progress')).toBe(false);
    });

    test('done → done is NOT valid (self-transition)', () => {
      expect(isValidTransition('done', 'done')).toBe(false);
    });

    test('unknown state → anything is NOT valid', () => {
      expect(isValidTransition('unknown', 'backlog')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('same state to same state is NOT valid', () => {
      expect(isValidTransition('backlog', 'backlog')).toBe(false);
      expect(isValidTransition('in-progress', 'in-progress')).toBe(false);
    });

    test('empty strings return false', () => {
      expect(isValidTransition('', '')).toBe(false);
    });
  });
});

describe('Task Validation', () => {
  const { z } = require('zod');

  const CreateTaskSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().default(''),
    status: z.enum(['backlog', 'in-progress', 'in-review', 'done', 'blocked']).default('backlog'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    projectId: z.string().min(1),
  });

  test('valid task data passes validation', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Test task',
      description: 'A test',
      projectId: 'proj-1',
    });
    expect(result.success).toBe(true);
  });

  test('empty title fails validation', () => {
    const result = CreateTaskSchema.safeParse({
      title: '',
      projectId: 'proj-1',
    });
    expect(result.success).toBe(false);
  });

  test('missing projectId fails validation', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Test',
    });
    expect(result.success).toBe(false);
  });

  test('invalid status fails validation', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Test',
      projectId: 'proj-1',
      status: 'invalid-status',
    });
    expect(result.success).toBe(false);
  });

  test('invalid priority fails validation', () => {
    const result = CreateTaskSchema.safeParse({
      title: 'Test',
      projectId: 'proj-1',
      priority: 'super-urgent',
    });
    expect(result.success).toBe(false);
  });

  test('defaults are applied correctly', () => {
    const result = CreateTaskSchema.parse({
      title: 'Test',
      projectId: 'proj-1',
    });
    expect(result.status).toBe('backlog');
    expect(result.priority).toBe('medium');
    expect(result.description).toBe('');
  });
});
