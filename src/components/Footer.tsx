import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">SA</span>
              </div>
              <span className="font-bold text-base">SiteAudit AI</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Find out exactly what&apos;s hurting your website.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Product</h3>
            <ul className="space-y-2">
              <li><Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Free Audit</Link></li>
              <li><Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-3">Audit Categories</h3>
            <ul className="space-y-2">
              <li><span className="text-sm text-muted-foreground">SEO Analysis</span></li>
              <li><span className="text-sm text-muted-foreground">Performance</span></li>
              <li><span className="text-sm text-muted-foreground">Accessibility</span></li>
              <li><span className="text-sm text-muted-foreground">Security</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SiteAudit AI. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Automated website auditing. Real data. Real insights.
          </p>
        </div>
      </div>
    </footer>
  );
}
