import { useState } from "react";
import { useListContacts } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useListContacts({});

  const filtered = contacts?.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1">Manage your customer directory</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[280px]">Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">Loading contacts...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  {search ? `No contacts matching "${search}"` : "No contacts found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/30 cursor-pointer">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {contact.name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>
                      {contact.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {contact.phone && <span className="text-sm">{contact.phone}</span>}
                      {contact.email && <span className="text-xs text-muted-foreground">{contact.email}</span>}
                      {!contact.phone && !contact.email && <span className="text-xs text-muted-foreground italic">None</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{contact.channelType}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono truncate max-w-[150px]">
                    {contact.externalId}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
