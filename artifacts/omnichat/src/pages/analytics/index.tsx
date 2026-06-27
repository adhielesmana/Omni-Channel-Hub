import { useState, useMemo } from "react";
import {
  useGetStatsOverview,
  useGetAgentWorkload,
  useGetConversationsByChannel,
  useGetConversationsByDepartment,
  useGetStatsPeriods,
} from "@workspace/api-client-react";
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Download, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend, ComposedChart, Line,
} from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  facebook: "#3b82f6",
};

const DEPT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

function getCurrentPeriod(): { startDate: string; endDate: string } {
  const now = new Date();
  const day = now.getDate();
  let start: Date;
  let end: Date;
  if (day >= 26) {
    start = new Date(now.getFullYear(), now.getMonth(), 26);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 25, 23, 59, 59, 999);
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 26);
    end = new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59, 999);
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const { data: periods } = useGetStatsPeriods();
  const defaultPeriod = useMemo(() => getCurrentPeriod(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<{ label: string; startDate: string; endDate: string } | null>(null);

  const startDate = selectedPeriod?.startDate ?? defaultPeriod.startDate;
  const endDate = selectedPeriod?.endDate ?? defaultPeriod.endDate;
  const periodLabel = selectedPeriod?.label ?? "Current Period";

  const dateParams = { startDate, endDate };

  const { data: stats, isLoading: statsLoading } = useGetStatsOverview(dateParams);
  const { data: workload, isLoading: workloadLoading } = useGetAgentWorkload(dateParams);
  const { data: byChannel } = useGetConversationsByChannel(dateParams);
  const { data: byDepartment } = useGetConversationsByDepartment(dateParams);

  const channelData = (byChannel ?? []).map(c => ({
    name: c.channelType.charAt(0).toUpperCase() + c.channelType.slice(1),
    value: c.count,
    fill: CHANNEL_COLORS[c.channelType] ?? "#94a3b8",
  }));

  const deptData = (byDepartment ?? []).map((d, i) => ({
    name: d.departmentName ?? `Dept #${d.departmentId}`,
    count: d.count,
    fill: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const workloadForExport = useMemo(() => {
    return (workload ?? []).map(a => ({
      agent: a.agentName,
      open: a.openCount,
      resolved: a.resolvedCount,
    }));
  }, [workload]);

  const handleDownloadWorkload = () => {
    const headers = ["Agent", "Open", "Resolved"];
    const rows = workloadForExport.map(r => [r.agent, r.open, r.resolved]);
    downloadCsv(`agent-workload-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  const handleDownloadChannel = () => {
    const headers = ["Channel", "Count"];
    const rows = channelData.map(r => [r.name, r.value]);
    downloadCsv(`channel-distribution-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  const handleDownloadDepartment = () => {
    const headers = ["Department", "Count"];
    const rows = deptData.map(r => [r.name, r.count]);
    downloadCsv(`department-distribution-${startDate}-to-${endDate}.csv`, headers, rows);
  };

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-muted/10">
      <div className="mb-4 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics Overview</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Real-time performance and volume metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedPeriod?.label ?? "current"}
            onValueChange={(val) => {
              if (val === "current") {
                setSelectedPeriod(null);
              } else {
                const p = periods?.find(x => x.label === val);
                if (p) setSelectedPeriod(p);
              }
            }}
          >
            <SelectTrigger className="w-[220px] h-9">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Period (26–25)</SelectItem>
              {periods?.map(p => (
                <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {startDate} → {endDate}
          </span>
        </div>
      </div>

      {statsLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading dashboard...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
                <MessageSquare className="w-4 h-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalConversations ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.openConversations ?? 0} open · {stats?.pendingConversations ?? 0} pending</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
                <Clock className="w-4 h-4 text-blue-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.avgResponseTime ? `${Math.round(stats.avgResponseTime)}m` : '—'}</div>
                <p className="text-xs text-muted-foreground mt-1">First response target</p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.resolvedConversations ?? 0}</div>
                <Progress
                  value={stats?.totalConversations ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100) : 0}
                  className="h-1.5 mt-3"
                />
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
                <AlertCircle className="w-4 h-4 text-amber-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats?.unassignedConversations ?? 0}</div>
                <p className="text-xs text-amber-600/70 mt-1">Requires immediate attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Agent Workload — Dual Color */}
            <Card className="shadow-sm h-[420px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Agent Workload — {periodLabel}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleDownloadWorkload}>
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <ScrollArea className="flex-1">
                {workloadLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading workload...</div>
                ) : !workload?.length ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No agent data</div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {workload.map((agent) => {
                      const maxVal = Math.max(...workload.map(a => Math.max(a.openCount, a.resolvedCount)), 1);
                      return (
                        <div key={agent.agentId} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                          <Avatar className="h-9 w-9 border border-border/50 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                              {agent.agentName?.substring(0, 2).toUpperCase() ?? "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{agent.agentName}</p>
                            <div className="flex flex-col gap-1 mt-1.5">
                              <div className="flex items-center gap-2">
                                <Progress value={(agent.openCount / maxVal) * 100} className="h-1.5 flex-1 [&>div]:bg-indigo-600" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
                                  {agent.openCount} open
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={(agent.resolvedCount / maxVal) * 100} className="h-1.5 flex-1 [&>div]:bg-emerald-500" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
                                  {agent.resolvedCount} resolved
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>

            {/* Channel Distribution Pie Chart */}
            <Card className="shadow-sm h-[420px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Channel Distribution — {periodLabel}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleDownloadChannel}>
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-4">
                {!channelData.length ? (
                  <p className="text-sm text-muted-foreground">No channel data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {channelData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string) => [value, name]}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resolved Conversations by Agent */}
          {workload && workload.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Resolved Conversations by Agent — {periodLabel}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleDownloadWorkload}>
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workload.map((a, i) => ({ name: a.agentName ?? `Agent #${a.agentId}`, count: a.resolvedCount, fill: DEPT_COLORS[i % DEPT_COLORS.length] }))} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {workload.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Department Distribution Bar Chart */}
          {deptData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Conversations by Department — {periodLabel}</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={handleDownloadDepartment}>
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {deptData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
