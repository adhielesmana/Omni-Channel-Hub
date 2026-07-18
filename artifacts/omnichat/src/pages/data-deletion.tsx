import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, MessageSquare, Trash2, AlertTriangle, CheckCircle, Clock, Mail, Shield, Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/logo/Logo";

export default function DataDeletion() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#07080f] text-white antialiased">
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#07080f]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <Logo size={32} />
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
            <Trash2 className="w-3 h-3" /> Compliance
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Data Deletion Policy</h1>
          <p className="text-sm text-gray-400">Last updated: June 26, 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed">
          <p className="text-gray-400 mb-8">
            At OmniChat, we respect your right to control your personal data. This Data Deletion Policy explains how you can request deletion of your data, what we delete, and how long the process takes.
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-violet-400" /> 1. What You Can Delete
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {[
                { icon: FileJson, title: "Your Account", desc: "Profile, email, password, and workspace settings" },
                { icon: MessageSquare, title: "Conversations", desc: "All messages, threads, and communication history" },
                { icon: Shield, title: "Contacts", desc: "Customer contacts and their associated data" },
                { icon: Download, title: "Channels", desc: "WhatsApp, Instagram, and Facebook channel configurations" },
                { icon: Clock, title: "Analytics", desc: "Performance reports and historical metrics" },
                { icon: Shield, title: "Audit Logs", desc: "Activity and action logs for your workspace" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <Icon className="w-5 h-5 text-violet-400 mb-2" />
                  <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" /> 2. How to Request Deletion
            </h2>
            <p className="mb-3">
              You have several ways to delete your data:
            </p>
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white mb-2">Option A: Delete from Settings</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Go to <strong>Settings → Advanced → Danger Zone</strong> and select "Delete workspace". This will permanently remove all workspace data.
                </p>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> This action is immediate and cannot be undone.
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white mb-2">Option B: Contact Support</h3>
                <p className="text-sm text-gray-400 mb-3">
                  Email us at <a href="mailto:privacy@omnichat.io" className="text-violet-400 hover:underline">privacy@omnichat.io</a> with the subject "Data Deletion Request". Include your workspace name and registered email address.
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-4 h-4" /> Response within 48 hours; deletion completed within 30 days.
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="text-base font-semibold text-white mb-2">Option C: Use the Form Below</h3>
                <p className="text-sm text-gray-400">
                  Submit a deletion request using the form at the bottom of this page. Our team will verify your identity and process the request.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">3. Deletion Timeframes</h2>
            <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Data Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Deletion Time</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {[
                    { type: "Account & profile", time: "Immediately", method: "Settings or support" },
                    { type: "Conversations & messages", time: "Within 30 days", method: "Support request" },
                    { type: "Contacts & customer data", time: "Within 30 days", method: "Support request" },
                    { type: "Channel configurations", time: "Immediately", method: "Settings" },
                    { type: "Analytics & reports", time: "Within 30 days", method: "Support request" },
                    { type: "Billing & payment records", time: "7 years (legal)", method: "Cannot be deleted" },
                    { type: "Audit logs", time: "90 days after retention", method: "Automatic" },
                  ].map(({ type, time, method }) => (
                    <tr key={type}>
                      <td className="px-4 py-3 text-gray-300">{type}</td>
                      <td className="px-4 py-3 text-gray-400">{time}</td>
                      <td className="px-4 py-3 text-gray-400">{method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">4. Data We Cannot Delete</h2>
            <p className="mb-3">
              In certain situations, we are required to retain data even after a deletion request:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Legal obligations:</strong> Billing records, tax documentation, and compliance-related data must be retained for statutory periods (typically 7 years).</li>
              <li><strong>Active disputes:</strong> Data related to ongoing legal proceedings, fraud investigations, or abuse reports will be retained until the matter is resolved.</li>
              <li><strong>Aggregated analytics:</strong> Fully anonymized statistics that cannot be traced back to any individual or workspace are not subject to deletion requests.</li>
              <li><strong>Backup systems:</strong> Data may persist in encrypted backups for up to 90 days after deletion. These backups are automatically purged on rotation.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Export Before Deletion</h2>
            <p className="text-gray-400">
              Before requesting deletion, you may want to export your data. Go to <strong>Settings → Advanced → Danger Zone</strong> and click "Export all data" to receive a ZIP archive of your conversations, contacts, and workspace configuration. You can also export individual conversations from the Inbox by clicking the export icon in the conversation header.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">6. GDPR & CCPA Rights</h2>
            <p className="mb-3">
              For users in the European Union and California, you have additional rights:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400">
              <li><strong>Right to erasure (GDPR Article 17):</strong> You can request deletion of your personal data, and we will comply unless a legal exception applies.</li>
              <li><strong>Right to deletion (CCPA):</strong> California residents can request deletion of personal information collected by OmniChat.</li>
              <li><strong>Right to restriction:</strong> You can request that we stop processing your data while we evaluate your deletion request.</li>
              <li><strong>Right to objection:</strong> You can object to processing based on legitimate interests.</li>
            </ul>
            <p className="mt-3 text-gray-400">
              To exercise these rights, contact us at <a href="mailto:privacy@omnichat.io" className="text-violet-400 hover:underline">privacy@omnichat.io</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Data</h2>
            <p className="text-gray-400">
              Deleting your OmniChat data does not automatically delete data held by Meta (WhatsApp, Instagram, Facebook) or other third-party platforms. You must manage deletion separately through those platforms' privacy settings. We can provide guidance on how to do this upon request.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-3">8. Contact Us</h2>
            <p className="text-gray-400">
              For questions about data deletion, contact:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-gray-400 mt-2">
              <li>Email: <a href="mailto:privacy@omnichat.io" className="text-violet-400 hover:underline">privacy@omnichat.io</a></li>
              <li>Data Protection Officer: OmniChat Inc., 123 Tech Avenue, Suite 500, San Francisco, CA 94105, USA</li>
            </ul>
          </section>
        </div>

        {/* Deletion Request Form */}
        <div className="mt-12 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-violet-400" /> Submit a Deletion Request
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Fill out the form below and our team will process your request within 30 days.
          </p>

          {submitted ? (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1">Request Submitted</h3>
              <p className="text-sm text-gray-400">
                We have received your deletion request. You will receive a confirmation email within 24 hours. Our team will verify your identity and begin the deletion process.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setSubmitted(false)}>
                Submit another request
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-300">Full Name</Label>
                  <Input placeholder="John Doe" required className="h-10 bg-white/[0.03] border-white/[0.08] text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-300">Email (registered with account)</Label>
                  <Input type="email" placeholder="you@company.com" required className="h-10 bg-white/[0.03] border-white/[0.08] text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Workspace Name</Label>
                <Input placeholder="Your workspace name" required className="h-10 bg-white/[0.03] border-white/[0.08] text-white" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Data to Delete</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Account & Profile", "All Conversations", "All Contacts", "Channel Configurations", "Analytics & Reports", "Everything (full workspace)"].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                      <input type="checkbox" className="accent-violet-500" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Reason for Deletion (optional)</Label>
                <Textarea
                  placeholder="Tell us why you're deleting your data..."
                  className="bg-white/[0.03] border-white/[0.08] text-white min-h-[80px]"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>This action is irreversible. Once deleted, your data cannot be recovered.</span>
              </div>
              <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white">
                {loading ? "Submitting..." : "Submit Deletion Request"}
              </Button>
            </form>
          )}
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
