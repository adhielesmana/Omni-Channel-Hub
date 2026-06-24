import { useListChannels } from "@workspace/api-client-react";
import { Share2, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Channels() {
  const { data: channels, isLoading } = useListChannels();

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground mt-1">Connect and manage communication platforms</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading channels...</div>
      ) : channels?.length === 0 ? (
        <div className="text-center p-12 border rounded-xl bg-card border-dashed">
          <Share2 className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="font-semibold mb-1">No channels connected</h3>
          <p className="text-sm text-muted-foreground mb-4">Connect WhatsApp, Instagram, or Facebook to start receiving messages.</p>
          <Button variant="outline">Connect Channel</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channels?.map((channel) => (
            <Card key={channel.id} className="shadow-sm flex flex-col">
              <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {channel.name}
                  </CardTitle>
                  <CardDescription className="capitalize">
                    {channel.channelType}
                  </CardDescription>
                </div>
                <Badge variant={channel.isActive ? 'default' : 'secondary'} className={channel.isActive ? 'bg-green-500/10 text-green-700 hover:bg-green-500/20 hover:text-green-800 border-green-500/20' : ''}>
                  {channel.isActive ? 'Connected' : 'Disconnected'}
                </Badge>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3 mt-2">
                  {channel.phoneNumber && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Phone Number</span>
                      <span className="font-mono">{channel.phoneNumber}</span>
                    </div>
                  )}
                  {channel.pageId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Page ID</span>
                      <span className="font-mono">{channel.pageId}</span>
                    </div>
                  )}
                  {channel.externalId && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">External ID</span>
                      <span className="font-mono truncate max-w-[120px]">{channel.externalId}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/20">
                <Button variant="ghost" size="sm" className="w-full gap-2 text-xs">
                  <Settings2 className="w-4 h-4" /> Configure
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
