import {
  useGetStatsOverview,
  useGetAgentWorkload,
  useGetSentimentDistribution,
  useGetAiAgentConversations,
} from "@workspace/api-client-react";
import { MessageSquare, Clock, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#94a3b8",
};

const AGENT_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function escapeCsvValue(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: workload, isLoading: workloadLoading } = useGetAgentWorkload();
  const { data: sentimentData } = useGetSentimentDistribution();
  const { data: aiAgentData } = useGetAiAgentConversations();

  const sentimentChartData = (sentimentData ?? []).map((s) => ({
    name: s.sentiment.charAt(0).toUpperCase() + s.sentiment.slice(1),
    value: s.count,
    fill: SENTIMENT_COLORS[s.sentiment] ?? "#94a3b8",
  }));

  const aiAgentCount = aiAgentData?.count ?? 0;
  const aiAgentChartData = [{ name: "AI Agents", count: aiAgentCount, fill: "#8b5cf6" }];

  const workloadData = workload ?? [];
  const maxWorkloadCount = Math.max(
    ...(workloadData.map((agent) => Math.max(agent.openCount, agent.resolvedCount))),
    1
  );
  const agentResolvedData = workloadData.map((agent, i) => ({
    name: agent.agentName ?? `Agent #${agent.agentId}`,
    count: agent.resolvedCount,
    fill: AGENT_COLORS[i % AGENT_COLORS.length],
  }));

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-muted/10">
      <div className="mb-4 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm hidden md:block">
          Real-time performance and volume metrics
        </p>
      </div>

      {statsLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading dashboard...</div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Conversations
                </CardTitle>
                <MessageSquare className="w-4 h-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalConversations ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.openConversations ?? 0} open · {stats?.pendingConversations ?? 0} pending
                </p>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Response Time
                </CardTitle>
                <Clock className="w-4 h-4 text-blue-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.avgResponseTime ? `${Math.round(stats.avgResponseTime)}m` : "—"}
                </div>
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
                  value={
                    stats?.totalConversations
                      ? Math.round((stats.resolvedConversations / stats.totalConversations) * 100)
                      : 0
                  }
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
                <div className="text-3xl font-bold text-amber-600">
                  {stats?.unassignedConversations ?? 0}
                </div>
                <p className="text-xs text-amber-600/70 mt-1">Requires immediate attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="shadow-sm h-[420px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Agent Workload</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Open and resolved conversations per agent
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    downloadCsv(
                      "agent-workload.csv",
                      ["Agent", "Open", "Resolved"],
                      workloadData.map((agent) => [
                        agent.agentName ?? `Agent #${agent.agentId}`,
                        agent.openCount,
                        agent.resolvedCount,
                      ])
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <ScrollArea className="flex-1">
                {workloadLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Loading workload...
                  </div>
                ) : !workloadData.length ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No agent data</div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {workloadData.map((agent) => (
                      <div
                        key={agent.agentId}
                        className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar className="h-9 w-9 border border-border/50 flex-shrink-0">
                          <AvatarImage src={agent.avatarUrl ?? undefined} alt={agent.agentName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                            {agent.agentName?.substring(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{agent.agentName}</p>
                          <div className="flex flex-col gap-1 mt-1.5">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={(agent.openCount / maxWorkloadCount) * 100}
                                className="h-1.5 flex-1 [&>div]:bg-indigo-600"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
                                {agent.openCount} open
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={(agent.resolvedCount / maxWorkloadCount) * 100}
                                className="h-1.5 flex-1 [&>div]:bg-emerald-500"
                              />
                              <span className="text-xs text-muted-foreground whitespace-nowrap w-16 text-right">
                                {agent.resolvedCount} resolved
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>

            <Card className="shadow-sm h-[420px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Customer Satisfaction (Sentiment)</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    downloadCsv(
                      "sentiment-distribution.csv",
                      ["Sentiment", "Count"],
                      sentimentChartData.map((s) => [s.name, s.value])
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-4">
                {!sentimentChartData.length ? (
                  <p className="text-sm text-muted-foreground">No sentiment data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={sentimentChartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {sentimentChartData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
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

          {agentResolvedData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Resolved Conversations by Agent</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    downloadCsv(
                      "resolved-conversations-by-agent.csv",
                      ["Agent", "Resolved"],
                      agentResolvedData.map((agent) => [agent.name, agent.count])
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={agentResolvedData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {agentResolvedData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {aiAgentCount > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
                <CardTitle className="text-base">AI Agent Conversations</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() =>
                    downloadCsv(
                      "ai-agent-conversations.csv",
                      ["Source", "Count"],
                      aiAgentChartData.map((row) => [row.name, row.count])
                    )
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={aiAgentChartData} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {aiAgentChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
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
