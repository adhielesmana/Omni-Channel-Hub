import { useGetStatsOverview, useGetAgentWorkload } from "@workspace/api-client-react";
import { MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useGetStatsOverview();
  const { data: workload, isLoading: workloadLoading } = useGetAgentWorkload();

  return (
    <div className="p-8 h-full overflow-y-auto bg-muted/10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Analytics Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time performance and volume metrics</p>
      </div>

      {statsLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading dashboard...</div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Top Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="shadow-sm border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
                <MessageSquare className="w-4 h-4 text-primary opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.totalConversations || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
                <Clock className="w-4 h-4 text-blue-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.avgResponseTime ? `${Math.round(stats.avgResponseTime)}m` : '0m'}</div>
                <p className="text-xs text-muted-foreground mt-1">-2m from last month</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.resolvedConversations || 0}</div>
                <Progress value={75} className="h-1.5 mt-3 bg-muted" />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-none shadow-md bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned</CardTitle>
                <AlertCircle className="w-4 h-4 text-amber-500 opacity-70" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{stats?.unassignedConversations || 0}</div>
                <p className="text-xs text-amber-600/70 mt-1">Requires immediate attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Agent Workload */}
            <Card className="shadow-sm col-span-1 h-[400px] flex flex-col">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-lg">Agent Workload</CardTitle>
              </CardHeader>
              <ScrollArea className="flex-1">
                <div className="p-0">
                  {workloadLoading ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Loading workload...</div>
                  ) : workload?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No agent data available</div>
                  ) : (
                    <div className="flex flex-col divide-y">
                      {workload?.map((agent) => (
                        <div key={agent.agentId} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {agent.agentName?.substring(0, 2).toUpperCase() || "??"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm leading-none mb-1">{agent.agentName}</p>
                              <p className="text-xs text-muted-foreground">{agent.resolvedCount} resolved all time</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Open</span>
                              <span className="font-bold text-lg">{agent.openCount}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>

            {/* Placeholder for Channel Distribution */}
            <Card className="shadow-sm col-span-1 h-[400px] flex flex-col items-center justify-center bg-muted/10 border-dashed">
              <BarChart2 className="w-12 h-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="font-medium text-muted-foreground">Channel Distribution</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] text-center">Chart component would be rendered here in full implementation.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// Just importing the icon explicitly for the placeholder
import { BarChart2 } from "lucide-react";
