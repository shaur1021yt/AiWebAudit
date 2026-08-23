export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </p>

      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">1. Data We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you use SiteAudit AI, we collect the following information:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
            <li><strong>Account information:</strong> Email address and name (when you create an account).</li>
            <li><strong>Website URLs:</strong> URLs you submit for auditing. These are used solely to perform the audit.</li>
            <li><strong>Audit data:</strong> Results of website audits, including scores, issues found, and recommendations.</li>
            <li><strong>Payment information:</strong> Processed securely through Stripe. We do not store credit card numbers.</li>
            <li><strong>Usage data:</strong> Pages visited, features used, and interaction patterns (for improving our service).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. How We Use Your Data</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>To perform website audits and deliver reports.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>To improve our service and develop new features.</li>
            <li>To communicate with you about your account or our service.</li>
            <li>To detect and prevent abuse of our service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Data Sharing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We do not sell your personal data. We may share data with:
          </p>
          <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
            <li><strong>Stripe:</strong> For payment processing.</li>
            <li><strong>Service providers:</strong> For hosting, analytics, and email delivery.</li>
            <li><strong>Legal authorities:</strong> When required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Audit data is retained until you delete it. Account data is retained until you delete your account.
            We may retain anonymized usage data indefinitely for analytics purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Your Rights</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Access your personal data.</li>
            <li>Correct inaccurate data.</li>
            <li>Delete your data and account.</li>
            <li>Export your data.</li>
            <li>Opt out of non-essential data collection.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For privacy-related inquiries, please contact us at privacy@siteaudit.ai.
          </p>
        </section>
      </div>
    </div>
  );
}
