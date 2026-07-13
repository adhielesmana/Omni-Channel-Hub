import { useState } from "react";
import { useListOutbox } from "@workspace/api-client-react";
import type { ListOutboxParams } from "@workspace/api-client-react";
import { Send, CheckCircle2, Clock, AlertCircle, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  sent: { label: "Sent", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-blue-100 text-blue-800 border-blue-300" },
  delivered: { label: "Delivered", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-100 text-green-800 border-green-300" },
  read: { label: "Read", icon: <Eye className="w-3 h-3" />, className: "bg-purple-100 text-purple-800 border-purple-300" },
  failed: { label: "Failed", icon: <AlertCircle className="w-3 h-3" />, className: "bg-red-100 text-red-800 border-red-300" },
  pending: { label: "Pending", icon: <Clock className="w-3 h-3" />, className: "bg-yellow-100 text-yellow-800 border-yellow-300" },
};

export default function ApiOutbox() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 15;

  const params: ListOutboxParams = { page, limit };
  if (statusFilter && statusFilter !== "all") {
    params.status = statusFilter as ListOutboxParams["status"];
  }

  const { data, isLoading } = useListOutbox(params);
  const messages = data?.messages ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Send className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">API Outbox</h1>
          <Badge variant="secondary" className="text-xs">{total}</Badge>
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No API messages sent yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Content</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => {
                const status = msg.deliveryStatus ?? "pending";
                const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
                return (
                  <TableRow key={msg.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{msg.recipientName || "-"}</span>
                        <span className="text-xs text-muted-foreground">{msg.recipientPhone || "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{msg.channelName || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {msg.content || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs gap-1 ${config.className}`}>
                        {config.icon}
                        {config.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages >= 1 && (
        <div className="border-t px-6 py-3">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                const pageNum = start + i;
                if (pageNum > totalPages) return null;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={pageNum === page}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
