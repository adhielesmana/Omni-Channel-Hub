import { useGetStatsOverview, useGetAgentWorkload, useGetConversationsByChannel, useGetConversationsByDepartment } from "@workspace/api-client-react";
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "#22c55e",
  instagram: "#ec4899",
  facebook: "#3b82f6",
};

const DEPT_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: workload, isLoading: workloadLoading } = useGetAgentWorkload();
  const { data: byChannel } = useGetConversationsByChannel();
  const { data: byDepartment } = useGetConversationsByDepartment();

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

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-muted/10">
      <div className="mb-4 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm hidden md:block">Real-time performance and volume metrics</p>
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
            {/* Agent Workload */}
            <Card className="shadow-sm h-[380px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0">
                <CardTitle className="text-base">Agent Workload</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                {workloadLoading ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Loading workload...</div>
                ) : !workload?.length ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No agent data</div>
                ) : (
                  <div className="flex flex-col divide-y">
                    {workload.map((agent) => {
                      const maxOpen = Math.max(...workload.map(a => a.openCount), 1);
                      return (
                        <div key={agent.agentId} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                          <Avatar className="h-9 w-9 border border-border/50 flex-shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                              {agent.agentName?.substring(0, 2).toUpperCase() ?? "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{agent.agentName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={(agent.openCount / maxOpen) * 100} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">{agent.openCount} open</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs text-muted-foreground">{agent.resolvedCount} resolved</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </Card>

            {/* Channel Distribution Pie Chart */}
            <Card className="shadow-sm h-[380px] flex flex-col">
              <CardHeader className="border-b bg-muted/20 flex-shrink-0">
                <CardTitle className="text-base">Channel Distribution</CardTitle>
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
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base">Resolved Conversations by Agent</CardTitle>
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
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base">Conversations by Department</CardTitle>
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
