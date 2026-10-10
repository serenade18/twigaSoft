import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthLayoutProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <main id="main" className="grid min-h-svh place-items-center bg-[linear-gradient(135deg,#071e50,#0d2b45)] px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="mx-auto mb-6 block w-fit rounded-lg bg-white px-5 py-3" aria-label="Back to AFRIGULF Exchange">
          <img src="/assets/twb-footer-logo.png" alt="TWB Global Tourism" width="140" height="84" className="h-12 w-auto" />
        </Link>
        <Card className="gap-5 border-0 py-8 shadow-[0_25px_80px_#00000040]">
          <CardHeader className="gap-2 px-8">
            <p className="mb-0 text-xs font-bold tracking-[0.13em] text-[#ae7624]">ADMIN PORTAL</p>
            <CardTitle><h1 className="mb-0 text-[28px] leading-tight">{title}</h1></CardTitle>
            <CardDescription className="text-[15px] leading-relaxed">{description}</CardDescription>
          </CardHeader>
          <CardContent className="px-8">{children}</CardContent>
          {footer && <CardFooter className="justify-center px-8 text-sm text-muted-foreground">{footer}</CardFooter>}
        </Card>
      </div>
    </main>
  );
}

/** Link styled for the auth cards; "!" beats the site-wide `a { color: inherit }` rule. */
export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link to={to} className="font-semibold text-[#986115]! underline-offset-4 hover:underline">{children}</Link>;
}
