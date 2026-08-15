import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

// Karta kanvasdan ramka bilan emas, FON FARQI va nozik soya bilan ajraladi.
// Ilgari `border-line` edi — kulrang fonda qalin ko'rinardi va sahifa
// «katakcha to'ri» ga aylanardi. Endi chegara deyarli sezilmaydi, kartani
// ko'taradigan narsa — oq sirt va yumshoq soya.
function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-panel border border-line-subtle bg-surface shadow-card',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1 p-6 pb-4', className)} {...props} />
  );
}

function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-heading text-ink', className)} {...props} />
  );
}

function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-caption text-ink-3', className)} {...props} />;
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
};
