// Jest multi-project configuration for IDE/editor integration
// Automatically discovers all Jest projects in the workspace
import type { Config } from 'jest';
import { getJestProjectsAsync } from '@nx/jest';

export default async (): Promise<Config> => ({
  projects: await getJestProjectsAsync()
});

