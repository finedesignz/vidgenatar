import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../components/**/*.mdx', '../components/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: { name: '@storybook/nextjs', options: {} },
  docs: { autodocs: 'tag' },
};
export default config;
