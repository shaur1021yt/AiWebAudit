export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By using SiteAudit AI, you agree to these Terms of Service. If you do not agree, do not use our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Service Description</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SiteAudit AI provides automated website auditing services. We analyze publicly accessible web pages
            and provide reports on SEO, performance, accessibility, security, content, and conversion signals.
            Our analysis is automated and may not detect all issues. It is not a substitute for professional auditing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Payments</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>All payments are processed through Stripe.</li>
            <li>One-time purchases (Full Audit, AI Plan, Pro Audit) are non-refundable once the report is generated.</li>
            <li>Subscriptions (Monitoring) can be canceled at any time and will not renew.</li>
            <li>If a scan fails, you will not be charged.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Usage Limits</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Free audits are limited per account to prevent abuse. Paid audits do not have usage limits.
            We reserve the right to limit usage if we detect abuse of our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Accuracy Disclaimer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our audits are performed by automated systems. While we strive for accuracy, some issues may not be
            detected or some results may not be perfectly accurate. Our analysis should be used as a guide,
            not as the sole basis for making decisions. We explicitly state when a metric cannot be reliably measured.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generated reports and recommendations are provided for your use. You may use them as you see fit
            for your own websites.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SiteAudit AI is provided as-is. We are not liable for any damages arising from the use of our service
            or reliance on our reports.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Changes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these terms from time to time. Continued use of the service constitutes acceptance of
            updated terms.
          </p>
        </section>
      </div>
    </div>
  );
}
