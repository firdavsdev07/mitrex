import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../badge';
import { Button } from '../button';

describe('Badge Component', () => {
  it('renders children content correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies classes based on variant prop', () => {
    const { container: successContainer } = render(<Badge variant="success">Success</Badge>);
    expect(successContainer.firstChild).toHaveClass('bg-green-500/10');

    const { container: dangerContainer } = render(<Badge variant="danger">Danger</Badge>);
    expect(dangerContainer.firstChild).toHaveClass('bg-red-500/10');
  });
});

describe('Button Component', () => {
  it('renders children and responds to click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders spinner when loading is true and is disabled', () => {
    render(<Button loading={true}>Submit</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('applies appropriate classes for variants and sizes', () => {
    const { container } = render(<Button variant="secondary" size="sm">Secondary Sm</Button>);
    const button = container.firstChild;
    expect(button).toHaveClass('bg-zinc-800');
    expect(button).toHaveClass('px-3');
  });
});
