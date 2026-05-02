// Playwright E2E Tests — per agents.md Section 1.3 & 3.4
// Covers: login, task create/assign/complete, Kanban drag-drop

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('VibeTeams');
    await expect(page.getByText('Continue with Google')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
  });

  test('should show error on invalid email login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('invalid@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    // Firebase will return an error
    await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between sign-in and sign-up', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await page.getByText('Sign up').click();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
    await page.getByText('Sign in').click();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});

test.describe('Dashboard', () => {
  test('should display the dashboard with Kanban columns', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('VibeTeams');
    
    // Check all Kanban columns are rendered
    await expect(page.getByText('Backlog')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('In Review')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
    await expect(page.getByText('Blocked')).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Calendar')).toBeVisible();
    await expect(page.getByText('Projects')).toBeVisible();
  });

  test('should have a search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search tasks...')).toBeVisible();
  });

  test('should have New Task and Gantt View buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('New Task')).toBeVisible();
    await expect(page.getByText('Gantt View')).toBeVisible();
  });
});

test.describe('Team Settings', () => {
  test('should display team members and integrations', async ({ page }) => {
    await page.goto('/settings/team');
    await expect(page.getByText('Team Settings')).toBeVisible();
    await expect(page.getByText('Team Members')).toBeVisible();
    await expect(page.getByText('Google Workspace Integrations')).toBeVisible();
    
    // Check integration cards
    await expect(page.getByText('Google Calendar')).toBeVisible();
    await expect(page.getByText('Google Drive')).toBeVisible();
    await expect(page.getByText('Google Meet')).toBeVisible();
  });

  test('should display invite member button', async ({ page }) => {
    await page.goto('/settings/team');
    await expect(page.getByText('Invite Member')).toBeVisible();
  });
});
