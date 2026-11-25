import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11.5px] font-semibold leading-4',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-ai text-primary',
        primary: 'border-transparent bg-ai text-primary',
        secondary: 'border-transparent bg-ai text-primary',
        success: 'border-transparent bg-success/15 text-success',
        warning: 'border-transparent bg-warning/15 text-warning',
        accent: 'border-transparent bg-[#f0eaff] text-[#6b3fd4] dark:bg-[#31294a] dark:text-[#c3b0ff]',
        muted: 'border-transparent bg-hover text-muted-foreground',
        outline: 'border-border bg-surface text-muted-foreground',
        demo: 'border-dashed border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
