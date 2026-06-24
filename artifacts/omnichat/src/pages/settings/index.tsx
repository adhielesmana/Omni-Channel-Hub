import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/10">
      <div className="text-center flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center mb-6">
          <SettingsIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          Platform configuration, routing rules, and general workspace settings are configured here.
        </p>
      </div>
    </div>
  );
}
