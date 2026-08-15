import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../badge';
import { Button } from '../button';

describe('Badge Component', () => {
  it('renders children content correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies semantic token classes based on variant prop', () => {
    const { container: successContainer } = render(<Badge variant="success">Success</Badge>);
    expect(successContainer.firstChild).toHaveClass('bg-positive-quiet');

    const { container: dangerContainer } = render(<Badge variant="danger">Danger</Badge>);
    expect(dangerContainer.firstChild).toHaveClass('bg-negative-quiet');
  });

  // Dizayn qarori: tizimda amber yo'q — u aksent apelsini bilan chalkashadi.
  // Shuning uchun `warning` va `orange` bir xil aksent tokenlariga tushadi.
  it('maps warning and orange to the same accent tokens', () => {
    const { container: warning } = render(<Badge variant="warning">Warning</Badge>);
    const { container: orange } = render(<Badge variant="orange">Orange</Badge>);

    expect(warning.firstChild).toHaveClass('bg-accent-quiet');
    expect(orange.firstChild).toHaveClass('bg-accent-quiet');
    expect((warning.firstChild as HTMLElement).className).toBe(
      (orange.firstChild as HTMLElement).className,
    );
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

  it('applies semantic token classes for variants and sizes', () => {
    const { container } = render(<Button variant="secondary" size="sm">Secondary Sm</Button>);
    const button = container.firstChild;
    expect(button).toHaveClass('bg-surface-raised');
    expect(button).toHaveClass('text-caption');
    expect(button).toHaveClass('px-3');
  });

  // Token qatlamining maqsadi: hech bir primitiv qattiq rang yozmasligi kerak,
  // aks holda u ikkinchi mavzuda sinadi.
  it('uses no raw palette colours', () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const className = (container.firstChild as HTMLElement).className;
    expect(className).not.toMatch(/\b(zinc|orange|red|green|yellow|blue)-\d{2,3}\b/);
  });
});
