import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="page-glow flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo size={40} />
      <div className="mt-6 flex size-12 items-center justify-center rounded-lg bg-ai text-primary">
        <Compass className="size-6" />
      </div>
      <h1 className="mt-4 text-[1.6rem] font-semibold tracking-tight text-foreground">
        We could not find that page
      </h1>
      <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-muted-foreground">
        The problem may have been deleted, or the link is out of date.
      </p>
      <div className="mt-5 flex gap-2">
        <Button asChild variant="gradient">
          <Link href="/home">Go to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/problems">Explore problems</Link>
        </Button>
      </div>
    </div>
  )
}
