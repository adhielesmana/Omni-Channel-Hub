import { Link } from "wouter";
import { ArrowLeft, FileText, MessageSquare, Scale, AlertTriangle, Gavel, Ban, RefreshCw } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#07080f] text-white antialiased">
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
            <FileText className="w-3 h-3" /> Legal
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Terms of Service</h1>
          <p className="text-sm text-gray-400">Last updated: June 26, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
          <p className="text-gray-400 mb-8">
            These Terms of Service ("Terms") govern your access to and use of OmniChat's platform, services, and website (collectively, the "Services"). By using our Services, you agree to be bound by these Terms. If you do not agree, you may not use our Services.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">1. Definitions</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>"OmniChat"</strong> or <strong>"we"</strong> refers to OmniChat Inc., the provider of the Services.</li>
              <li><strong>"You"</strong> or <strong>"Customer"</strong> refers to the individual or organization using the Services.</li>
              <li><strong>"Workspace"</strong> refers to your organizational account on the platform.</li>
              <li><strong>"End Users"</strong> refers to your customers who communicate through connected channels.</li>
              <li><strong>"Channels"</strong> refers to WhatsApp Business, Instagram, Facebook Messenger, and other messaging platforms integrated with OmniChat.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">2. Account Registration</h2>
            <p className="mb-3">
              To use our Services, you must create an account. You agree to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>Promptly notify us of any unauthorized access or security breach.</li>
              <li>Accept responsibility for all activities that occur under your account.</li>
              <li>Be at least 18 years old or have legal capacity to form a binding contract.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">3. Subscription and Payment</h2>
            <p className="mb-3">
              OmniChat offers subscription-based plans. By subscribing:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>You agree to pay all applicable fees according to your selected plan.</li>
              <li>Subscription fees are billed in advance on a monthly or annual basis.</li>
              <li>All payments are processed securely through Stripe. We do not store your card details.</li>
              <li>You can upgrade, downgrade, or cancel your subscription at any time through your account settings.</li>
              <li>Refunds are provided at our discretion, except where required by applicable law.</li>
              <li>We may change our pricing upon 30 days' notice. Price changes apply to your next billing cycle.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">4. Acceptable Use</h2>
            <p className="mb-3">
              You agree to use our Services only for lawful purposes and in accordance with these Terms. You must not:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Use the Services for spam, harassment, fraud, or any illegal activity.</li>
              <li>Send messages that violate Meta's or other platform providers' policies.</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts.</li>
              <li>Interfere with or disrupt the integrity or performance of the Services.</li>
              <li>Reverse engineer, decompile, or attempt to extract source code from our platform.</li>
              <li>Use automated systems (bots, scrapers) to access the Services without our permission.</li>
              <li>Upload or transmit viruses, malware, or other harmful code.</li>
              <li>Impersonate any person or misrepresent your affiliation with any entity.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Ownership and Responsibility</h2>
            <p className="mb-3">
              You retain ownership of all data you input into the platform. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Obtaining all necessary consents and permissions to process End User data.</li>
              <li>Complying with applicable data protection laws (GDPR, CCPA, etc.).</li>
              <li>Ensuring your use of messaging channels complies with Meta's Business Messaging Policy.</li>
              <li>Not using our platform to process sensitive personal data (health, financial, etc.) without proper safeguards.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              You grant us a limited license to process your data solely to provide and improve the Services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p className="mb-3">
              OmniChat and its licensors retain all intellectual property rights in the Services. You may not:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Copy, modify, or create derivative works based on our software.</li>
              <li>Remove any copyright, trademark, or proprietary notices from our platform.</li>
              <li>Use our trademarks or branding without our prior written consent.</li>
              <li>Sub-license, sell, or transfer your access to the Services.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">7. Service Availability and SLA</h2>
            <p className="mb-3">
              We aim to provide 99.9% uptime for our platform. However:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>We may perform scheduled maintenance with reasonable advance notice.</li>
              <li>We are not liable for downtime caused by factors beyond our control (internet outages, third-party service failures).</li>
              <li>SLA credits, if applicable, are described in your Enterprise agreement.</li>
              <li>We reserve the right to modify, suspend, or discontinue features with reasonable notice.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">8. Confidentiality and Security</h2>
            <p className="text-gray-400">
              We implement industry-standard security measures to protect your data. We will not disclose your confidential information to third parties except as described in our <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link> or as required by law. You are responsible for maintaining the security of your account credentials and promptly reporting any suspected breaches.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">9. Limitation of Liability</h2>
            <p className="mb-3">
              To the maximum extent permitted by law:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>Our total liability is limited to the amount you paid for the Services in the 12 months preceding the claim.</li>
              <li>We are not liable for indirect, incidental, special, consequential, or punitive damages.</li>
              <li>We are not responsible for delays or failures caused by circumstances beyond our reasonable control.</li>
              <li>We do not guarantee that the Services will meet your specific requirements or be error-free.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">10. Indemnification</h2>
            <p className="text-gray-400">
              You agree to indemnify and hold harmless OmniChat, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Services, your violation of these Terms, or your infringement of any third-party rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">11. Termination</h2>
            <p className="mb-3">
              You may terminate your account at any time. We may suspend or terminate your access if:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li>You violate these Terms or any applicable law.</li>
              <li>You fail to pay fees when due.</li>
              <li>Your use poses a security risk or harms our platform or other users.</li>
              <li>We discontinue the Services (with reasonable notice).</li>
            </ul>
            <p className="mt-3 text-gray-400">
              Upon termination, your data will be retained according to our <Link href="/data-deletion" className="text-violet-400 hover:underline">Data Deletion Policy</Link> and then permanently deleted.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">12. Governing Law and Dispute Resolution</h2>
            <p className="text-gray-400">
              These Terms are governed by the laws of the State of California, USA, without regard to its conflict of law provisions. Any disputes shall be resolved through binding arbitration in San Francisco, CA, except for claims that may be brought in small claims court.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">13. Changes to These Terms</h2>
            <p className="text-gray-400">
              We may update these Terms from time to time. We will notify you of material changes at least 30 days before they take effect. Your continued use of the Services after changes constitute acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">14. Contact Us</h2>
            <p className="text-gray-400">
              For questions about these Terms, contact us at <a href="mailto:legal@omnichat.io" className="text-violet-400 hover:underline">legal@omnichat.io</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/[0.06] py-8 px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} OmniChat Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
