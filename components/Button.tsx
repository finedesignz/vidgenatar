import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, style, ...rest }: ButtonProps) {
  const base = {
    padding: '0.5rem 0.875rem',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
  } as const;
  const variants = {
    primary: { background: '#4f46e5', color: '#fff' },
    secondary: { background: '#1f2937', color: '#fff' },
  } as const;
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...rest}>
      {children}
    </button>
  );
}
