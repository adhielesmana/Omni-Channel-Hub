import { useState } from "react";
import { useListContacts, useUpdateContact } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ContactDto = {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  channelType: string;
  externalId?: string;
  customFields?: string | null;
  createdAt: string;
};

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactDto | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", customFields: "" });

  const queryClient = useQueryClient();
  const { data: contacts, isLoading } = useListContacts({});
  const updateContact = useUpdateContact();

  const filtered = contacts?.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (contact: ContactDto) => {
    setEditContact(contact);
    setEditForm({
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      customFields: contact.customFields || "",
    });
    setEditOpen(true);
  };

  const handleSave = () => {
    if (!editContact) return;
    updateContact.mutate(
      {
        id: editContact.id,
        data: {
          name: editForm.name.trim(),
          phone: editForm.phone.trim() || null,
          email: editForm.email.trim() || null,
          customFields: editForm.customFields.trim() || null,
        },
      },
      {
        onSuccess: () => {
          setEditOpen(false);
          queryClient.invalidateQueries({ queryKey: ["listContacts"] });
        },
      }
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Manage your customer directory</p>
        </div>
        <div className="relative w-56 md:w-72">
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
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading contacts...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  {search ? `No contacts matching "${search}"` : "No contacts found"}
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/30 cursor-pointer">
                    <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {contact.avatarUrl ? <AvatarImage src={contact.avatarUrl} alt={contact.name} /> : null}
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
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Custom Fields (JSON)</Label>
              <Input value={editForm.customFields} onChange={e => setEditForm(f => ({ ...f, customFields: e.target.value }))} placeholder='{"key": "value"}' />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateContact.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
