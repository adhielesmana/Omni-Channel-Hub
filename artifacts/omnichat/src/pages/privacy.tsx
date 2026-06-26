import { Link } from "wouter";
import { ArrowLeft, Shield, MessageSquare, Eye, Lock, Globe, Trash2, Mail } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#07080f] text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#07080f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white tracking-tight">OmniChat</span>
            </div>
          </Link>
          <Link href="/">
            <button className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to home
            </button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs font-semibold mb-4">
            <Shield className="w-3 h-3" /> Legal
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Last updated: June 26, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
          <p className="text-gray-400 mb-8">
            OmniChat ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, services, and website.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-400" /> 1. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information that you provide directly to us, information we collect automatically when you use our services, and information we receive from third parties.
            </p>
            <h3 className="text-base font-semibold text-white mt-4 mb-2">1.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Account information:</strong> name, email address, password, and company/organization name when you register for an account.</li>
              <li><strong>Workspace data:</strong> team member names, roles, and contact information you add to your workspace.</li>
              <li><strong>Channel configuration:</strong> phone numbers, WhatsApp Business Account IDs, and access tokens you provide to connect messaging channels.</li>
              <li><strong>Conversation data:</strong> messages, contacts, and communication history that flows through our platform.</li>
              <li><strong>Payment information:</strong> handled by our payment processors (Stripe); we do not store full card details.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">1.2 Information We Collect Automatically</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Usage data:</strong> pages visited, features used, timestamps, and session duration.</li>
              <li><strong>Device information:</strong> browser type, IP address, device type, operating system.</li>
              <li><strong>Performance data:</strong> response times, error logs, and system health metrics.</li>
            </ul>

            <h3 className="text-base font-semibold text-white mt-4 mb-2">1.3 Information from Third Parties</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Meta (WhatsApp, Instagram, Facebook) via webhooks for message delivery.</li>
              <li>Payment and billing information from Stripe.</li>
              <li>Authentication data if you use SSO or third-party login.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-violet-400" /> 2. How We Use Your Information
            </h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Provide, maintain, and improve our messaging platform services.</li>
              <li>Process and deliver messages across connected channels (WhatsApp, Instagram, Facebook).</li>
              <li>Enable team collaboration, conversation routing, and assignment.</li>
              <li>Generate analytics and performance reports for your workspace.</li>
              <li>Send service notifications, security alerts, and billing communications.</li>
              <li>Prevent fraud, abuse, and security threats.</li>
              <li>Comply with legal obligations and enforce our Terms of Service.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" /> 3. How We Share Your Information
            </h2>
            <p className="mb-3">
              We do not sell your personal information. We share information only in limited circumstances:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>With your team:</strong> workspace members can see conversation data and contacts within your organization.</li>
              <li><strong>Service providers:</strong> we use Stripe for payments, hosting providers for infrastructure, and Meta for message delivery.</li>
              <li><strong>Legal compliance:</strong> when required by law, subpoena, or to protect rights and safety.</li>
              <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-violet-400" /> 4. Data Security
            </h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>TLS 1.3 encryption for all data in transit.</li>
              <li>Encrypted database storage at rest.</li>
              <li>Role-based access control with Admin, Supervisor, and Agent roles.</li>
              <li>Regular security audits and penetration testing.</li>
              <li>Automated vulnerability scanning and dependency updates.</li>
              <li>IP allowlist and two-factor authentication options.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-violet-400" /> 5. Data Retention
            </h2>
            <p className="mb-3">
              We retain your data for as long as your account is active or as needed to provide our services. You can configure retention policies in your workspace settings:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Conversation history: retained according to your plan (7-day, 90-day, or unlimited).</li>
              <li>Account data: retained until account deletion, then purged within 30 days.</li>
              <li>Analytics aggregates: retained for up to 2 years for trend analysis.</li>
              <li>Logs and audit data: retained for 90 days for security and compliance.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-violet-400" /> 6. International Data Transfers
            </h2>
            <p className="text-gray-400">
              Your data is hosted in the region you select during signup. We may use global infrastructure providers (e.g., AWS, GCP) with data centers worldwide. For transfers between regions, we rely on Standard Contractual Clauses and ensure adequate safeguards.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-violet-400" /> 7. Your Privacy Rights
            </h2>
            <p className="mb-3">Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Access your personal data and request a copy.</li>
              <li>Correct inaccurate or incomplete information.</li>
              <li>Delete your personal data (see Data Deletion).</li>
              <li>Restrict or object to certain processing activities.</li>
              <li>Export your data in a portable format.</li>
              <li>Withdraw consent for optional data processing.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              To exercise these rights, contact us at <a href="mailto:privacy@omnichat.io" className="text-violet-400 hover:underline">privacy@omnichat.io</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-violet-400" /> 8. Data Deletion
            </h2>
            <p className="text-gray-400">
              You can request deletion of your personal data at any time. See our <Link href="/data-deletion" className="text-violet-400 hover:underline">Data Deletion Policy</Link> for detailed procedures, timeframes, and exceptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">9. Cookies and Tracking</h2>
            <p className="text-gray-400">
              We use cookies and similar technologies to maintain your session, remember preferences, and analyze platform usage. You can manage cookie preferences through your browser settings. We do not use third-party advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">10. Children's Privacy</h2>
            <p className="text-gray-400">
              Our platform is not intended for children under 16. We do not knowingly collect personal data from children under 16. If you believe a child has provided us with personal data, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">11. Changes to This Policy</h2>
            <p className="text-gray-400">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or in-app notification. The "Last updated" date at the top of this page reflects the most recent revision.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-violet-400" /> 12. Contact Us
            </h2>
            <p className="text-gray-400">
              For questions or concerns about this Privacy Policy, contact:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 mt-2">
              <li>Email: <a href="mailto:privacy@omnichat.io" className="text-violet-400 hover:underline">privacy@omnichat.io</a></li>
              <li>Address: OmniChat Inc., Data Protection Office, 123 Tech Avenue, Suite 500, San Francisco, CA 94105, USA</li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} OmniChat Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
