export type Theme = 'light' | 'dark' | 'ghibli' | 'dracula';

export interface ThemeColors {
  name: string;
  description: string;
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  accent: string;
  muted: string;
  colors: string[];
  backgroundGradient?: string;
}

export type ThemeConfig = Record<Theme, ThemeColors>;

export const themes: ThemeConfig = {
  dracula: {
    name: 'Dracula',
    description: 'Official Dracula theme colors',
    background: '#282a36',
    foreground: '#f8f8f2',
    primary: '#ff79c6',
    secondary: '#6272a4',
    accent: '#bd93f9',
    muted: '#44475a',
    colors: [
      '#ff79c6', // Pink (keywords, operators)
      '#bd93f9', // Purple (constants, numbers)
      '#50fa7b', // Green (strings)
      '#ffb86c', // Orange (class names)
      '#8be9fd'  // Cyan (variables)
    ],
    backgroundGradient: 'bg-[radial-gradient(circle_at_center,_#44475a_0%,_#282a36_100%)]'
  },
  light: {
    name: 'Light',
    description: 'Clean and minimal light theme',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    primary: 'hsl(222.2 47.4% 11.2%)',
    secondary: 'hsl(217.2 32.6% 17.5%)',
    accent: 'hsl(210 40% 96.1%)',
    muted: 'hsl(210 40% 96.1%)',
    colors: ['#3a506b', '#6b7b8c', '#8d99ae', '#bcc2c9'],
    backgroundGradient: 'bg-gradient-to-r from-gray-50 to-gray-100'
  },
  dark: {
    name: 'Dark',
    description: 'Professional dark theme',
    background: 'hsl(224 71% 4%)',
    foreground: 'hsl(213 31% 91%)',
    primary: 'hsl(210 40% 98%)',
    secondary: 'hsl(215 25% 27%)',
    accent: 'hsl(216 34% 17%)',
    muted: 'hsl(223 47% 11%)',
    colors: ['#64748b', '#475569', '#334155', '#1e293b', '#0f172a'],
    backgroundGradient: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
  },
  ghibli: {
    name: 'Ghibli',
    description: 'Inspired by Studio Ghibli films',
    background: '#f0f4f8',
    foreground: '#2c5282',
    primary: '#2b6cb0',
    secondary: '#81e6d9',
    accent: '#9ae6b4',
    muted: '#e2e8f0',
    colors: ['#2b6cb0', '#81e6d9', '#9ae6b4', '#faf089', '#feb2b2'],
    backgroundGradient: 'bg-gradient-to-br from-blue-50 via-teal-50 to-green-50'
  },
};
