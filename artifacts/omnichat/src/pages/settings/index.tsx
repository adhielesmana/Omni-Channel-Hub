import { useState, useRef } from "react";
import { Bell, Globe, Link2, Repeat2, Shield, Sliders, Webhook, ChevronRight, Check, Copy, RefreshCw, Lock, Eye, EyeOff, Settings as SettingsIcon, User, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useChangePassword } from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "workspace", label: "Workspace", icon: Globe },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "routing", label: "Routing Rules", icon: Repeat2 },
  { id: "webhooks", label: "Webhooks & API", icon: Webhook },
  { id: "integrations", label: "Integrations", icon: Link2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "advanced", label: "Advanced", icon: Sliders },
];

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between py-4 gap-8">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/media/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("omnichat_token")}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAvatarUrl(data.url);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Profile"
        description="Manage your personal profile information."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow label="Avatar" description="Upload a profile picture. JPG, PNG, GIF, WebP, SVG up to 10MB.">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 border-2 border-border">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={user?.name} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {user?.initials ?? "??"}
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleUploadClick} disabled={uploading}>
              <Upload className="w-3.5 h-3.5" />
              {uploading ? "Uploading..." : "Change photo"}
            </Button>
          </div>
        </SettingRow>
        <SettingRow label="Name" description="Your display name shown across the platform.">
          <span className="text-sm font-medium">{user?.name}</span>
        </SettingRow>
        <SettingRow label="Email" description="Your login email address.">
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </SettingRow>
        <SettingRow label="Role" description="Your access level in the workspace.">
          <Badge variant="outline" className="capitalize text-xs">{user?.role}</Badge>
        </SettingRow>
      </div>
    </div>
  );
}

function WorkspaceSection() {
  return (
    <div>
      <SectionHeader
        title="Workspace"
        description="General settings for your OmniChat workspace."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow label="Workspace name" description="Shown in the browser tab and internal references.">
          <Input defaultValue="OmniChat HQ" className="w-56 h-8 text-sm" />
        </SettingRow>
        <SettingRow label="Timezone" description="Used for scheduling and timestamp display.">
          <Select defaultValue="utc">
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="utc">UTC</SelectItem>
              <SelectItem value="est">America/New_York</SelectItem>
              <SelectItem value="pst">America/Los_Angeles</SelectItem>
              <SelectItem value="gmt">Europe/London</SelectItem>
              <SelectItem value="cet">Europe/Paris</SelectItem>
              <SelectItem value="ist">Asia/Kolkata</SelectItem>
              <SelectItem value="jst">Asia/Tokyo</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Language" description="Interface language for all agents.">
          <Select defaultValue="en">
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="ar">العربية</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Business hours" description="Only count response time during working hours.">
          <Switch defaultChecked />
        </SettingRow>
        <div className="py-4">
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div>
      <SectionHeader
        title="Notifications"
        description="Control when and how agents are notified."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow label="New unassigned conversation" description="Notify all agents when a conversation arrives with no owner.">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Assigned to me" description="Notify an agent when a conversation is assigned to them.">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="New inbound message" description="Notify the assigned agent on every new customer message.">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Conversation resolved" description="Notify the supervisor when an agent resolves a conversation.">
          <Switch />
        </SettingRow>
        <SettingRow label="SLA breach warning" description="Alert the supervisor 10 minutes before SLA deadline.">
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow label="Email digest" description="Send supervisors a daily summary of team performance.">
          <Select defaultValue="daily">
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <div className="py-4">
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function RoutingSection() {
  return (
    <div>
      <SectionHeader
        title="Routing Rules"
        description="Configure how incoming conversations are distributed to agents."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow
          label="Default routing mode"
          description="Applied to departments with no specific override."
        >
          <Select defaultValue="round_robin">
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="round_robin">Round Robin</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Auto-assign on channel match"
          description="Automatically assign to the department linked to the incoming channel."
        >
          <Switch defaultChecked />
        </SettingRow>
        <SettingRow
          label="Re-assign on reopen"
          description="When a resolved conversation is reopened, re-assign it via the routing rule."
        >
          <Switch />
        </SettingRow>
        <SettingRow
          label="Max conversations per agent"
          description="Pause round-robin assignment when an agent reaches this limit (0 = unlimited)."
        >
          <Input defaultValue="20" className="w-20 h-8 text-sm text-center" type="number" min="0" />
        </SettingRow>
        <SettingRow
          label="SLA response target"
          description="Target first-response time in minutes. Breaches trigger notifications."
        >
          <div className="flex items-center gap-2">
            <Input defaultValue="60" className="w-20 h-8 text-sm text-center" type="number" min="1" />
            <span className="text-sm text-muted-foreground">min</span>
          </div>
        </SettingRow>
        <SettingRow
          label="Auto-resolve idle conversations"
          description="Automatically resolve conversations with no activity after a set number of days."
        >
          <div className="flex items-center gap-2">
            <Input defaultValue="7" className="w-20 h-8 text-sm text-center" type="number" min="1" />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </SettingRow>
        <div className="py-4">
          <Button size="sm">Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function WebhookToken({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-muted text-foreground text-xs rounded-md px-3 py-2 font-mono border truncate">
          {value}
        </code>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0 flex-shrink-0" onClick={handleCopy}>
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

function WebhooksSection() {
  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/meta`
    : "/api/webhooks/meta";

  return (
    <div>
      <SectionHeader
        title="Webhooks & API"
        description="Configure Meta webhook endpoints and manage API access."
      />

      <div className="space-y-6">
        {/* Webhook URL */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Meta Webhook Endpoint</h3>
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Register this URL in your Meta App Dashboard under Webhooks for WhatsApp, Instagram, and Facebook Messenger.
          </p>
          <WebhookToken label="Callback URL" value={baseUrl} />
          <WebhookToken label="WhatsApp Verify Token" value="wh_verify_001" />
          <WebhookToken label="Instagram Verify Token" value="ig_verify_001" />
          <WebhookToken label="Facebook Verify Token" value="fb_verify_001" />
        </div>

        {/* API Key */}
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">API Key</h3>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this key to authenticate requests to the OmniChat REST API from external systems.
          </p>
          <WebhookToken label="Secret API Key" value="sk_live_omnichat_••••••••••••••••••••••••••••••••" />
        </div>

        {/* Subscribed events */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="font-medium text-sm">Subscribed Webhook Events</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              "messages", "message_deliveries", "message_reads",
              "messaging_postbacks", "feed", "mention",
            ].map((event) => (
              <div key={event} className="flex items-center gap-2 text-sm">
                <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-2.5 h-2.5 text-green-600" />
                </div>
                <code className="text-xs">{event}</code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  description,
  status,
  logo,
}: {
  name: string;
  description: string;
  status: "connected" | "available";
  logo: string;
}) {
  return (
    <div className="flex items-start justify-between p-4 rounded-xl border bg-card gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-base font-bold flex-shrink-0">
          {logo}
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">
        {status === "connected" ? (
          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">
            Connected
          </Badge>
        ) : (
          <Button variant="outline" size="sm" className="h-7 text-xs">
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div>
      <SectionHeader
        title="Integrations"
        description="Connect OmniChat to your existing tools and data sources."
      />
      <div className="space-y-3">
        <IntegrationCard
          name="WhatsApp Business API"
          description="Receive and send messages via Meta Cloud API v20.0+"
          status="connected"
          logo="W"
        />
        <IntegrationCard
          name="Instagram Direct"
          description="Manage Instagram DM threads from the unified inbox"
          status="connected"
          logo="I"
        />
        <IntegrationCard
          name="Facebook Messenger"
          description="Handle Messenger conversations from Facebook Pages"
          status="connected"
          logo="F"
        />
        <IntegrationCard
          name="Slack"
          description="Send conversation summaries and alerts to Slack channels"
          status="available"
          logo="S"
        />
        <IntegrationCard
          name="HubSpot CRM"
          description="Sync contacts and conversation history to HubSpot"
          status="available"
          logo="H"
        />
        <IntegrationCard
          name="Zapier"
          description="Automate workflows with 5,000+ apps via Zapier"
          status="available"
          logo="Z"
        />
      </div>
    </div>
  );
}

function SecuritySection() {
  const { user } = useAuth();
  const changePassword = useChangePassword();
  const [showPassDialog, setShowPassDialog] = useState(false);
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passError, setPassError] = useState("");
  const [passSuccess, setPassSuccess] = useState(false);

  const handleChangePassword = () => {
    setPassError("");
    setPassSuccess(false);
    if (!passForm.currentPassword || !passForm.newPassword) {
      setPassError("Both fields are required.");
      return;
    }
    if (passForm.newPassword.length < 6) {
      setPassError("New password must be at least 6 characters.");
      return;
    }
    if (passForm.newPassword !== passForm.confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }
    changePassword.mutate(
      { data: { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword } },
      {
        onSuccess: () => {
          setPassSuccess(true);
          setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
          setTimeout(() => setShowPassDialog(false), 1500);
        },
        onError: () => setPassError("Failed to change password. Check your current password."),
      }
    );
  };

  return (
    <div>
      <SectionHeader
        title="Security"
        description="Manage authentication and access control for your workspace."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow
          label="Your password"
          description={`Last changed — ${user?.email ?? "unknown"}`}
        >
          <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => setShowPassDialog(true)}>
            <Lock className="w-3.5 h-3.5" />
            Change password
          </Button>
        </SettingRow>
        <SettingRow label="Two-factor authentication" description="Require 2FA for all agents and admins.">
          <Switch />
        </SettingRow>
        <SettingRow label="Single sign-on (SSO)" description="Allow agents to log in with your identity provider.">
          <Badge variant="outline" className="text-xs">Enterprise</Badge>
        </SettingRow>
        <SettingRow label="IP allowlist" description="Restrict platform access to trusted IP ranges.">
          <Badge variant="outline" className="text-xs">Enterprise</Badge>
        </SettingRow>
        <SettingRow label="Session timeout" description="Automatically log out inactive agents.">
          <Select defaultValue="8h">
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="4h">4 hours</SelectItem>
              <SelectItem value="8h">8 hours</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Audit log"
          description="Track admin actions — user changes, channel edits, and configuration updates."
        >
          <Switch defaultChecked />
        </SettingRow>
        <div className="py-4">
          <Button size="sm">Save changes</Button>
        </div>
      </div>

      <Dialog open={showPassDialog} onOpenChange={(v) => { if (!v) { setShowPassDialog(false); setPassError(""); setPassSuccess(false); setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {passError && <p className="text-sm text-destructive">{passError}</p>}
            {passSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">Password changed successfully.</p>}
            <div className="flex flex-col gap-1.5">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={passForm.currentPassword}
                  onChange={e => setPassForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={passForm.newPassword}
                  onChange={e => setPassForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Min. 6 characters"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={passForm.confirmPassword}
                onChange={e => setPassForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPassDialog(false); setPassError(""); setPassSuccess(false); setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); }}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={changePassword.isPending}>
              {changePassword.isPending ? "Changing..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdvancedSection() {
  return (
    <div>
      <SectionHeader
        title="Advanced"
        description="Low-level configuration options. Change with care."
      />
      <div className="space-y-1 divide-y divide-border">
        <SettingRow
          label="Delete resolved conversations"
          description="Permanently delete conversations after they have been resolved for 90 days."
        >
          <Switch />
        </SettingRow>
        <SettingRow
          label="Mask phone numbers"
          description="Partially hide contact phone numbers from agents (show last 4 digits only)."
        >
          <Switch />
        </SettingRow>
        <SettingRow
          label="Allow agents to delete messages"
          description="Let agents remove their own outbound messages from the conversation view."
        >
          <Switch />
        </SettingRow>
        <SettingRow
          label="Sandbox mode"
          description="Route all outbound messages to a test number. No real messages sent."
        >
          <Switch />
        </SettingRow>
      </div>

      <Separator className="my-8" />

      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h3 className="font-medium text-sm text-destructive mb-1">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">
          These actions are irreversible. Make sure you understand the consequences before proceeding.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export all data</p>
              <p className="text-xs text-muted-foreground">Download a full archive of conversations and contacts.</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs h-8">Export</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete workspace</p>
              <p className="text-xs text-muted-foreground">Permanently delete this workspace and all its data.</p>
            </div>
            <Button variant="destructive" size="sm" className="text-xs h-8">Delete workspace</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SECTION_CONTENT: Record<string, React.ReactNode> = {
  profile: <ProfileSection />,
  workspace: <WorkspaceSection />,
  notifications: <NotificationsSection />,
  routing: <RoutingSection />,
  webhooks: <WebhooksSection />,
  integrations: <IntegrationsSection />,
  security: <SecuritySection />,
  advanced: <AdvancedSection />,
};

export default function Settings() {
  const [activeSection, setActiveSection] = useState("workspace");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Desktop Settings sidebar */}
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r bg-card/50 flex-col py-6 px-3 gap-0.5 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-3">
          Settings
        </p>
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <section.icon className="w-4 h-4 flex-shrink-0" />
              {section.label}
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />}
            </button>
          );
        })}
      </aside>

      {/* Mobile Settings sidebar */}
      <div className="md:hidden flex flex-col">
        <div className="p-4 border-b bg-card/50 flex items-center gap-2">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <SettingsIcon className="w-4 h-4" />
            {SECTIONS.find(s => s.id === activeSection)?.label ?? "Settings"}
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${mobileSidebarOpen ? 'rotate-90' : ''}`} />
          </button>
        </div>
        {mobileSidebarOpen && (
          <div className="flex flex-col gap-0.5 p-2 bg-card/50 border-b">
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setMobileSidebarOpen(false); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <section.icon className="w-4 h-4 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-8 max-w-2xl">
        {SECTION_CONTENT[activeSection]}
      </div>
    </div>
  );
}
