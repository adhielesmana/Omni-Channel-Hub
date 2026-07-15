import { useState, useRef, useMemo, useEffect } from "react";
import { useListContacts, useUpdateContact, useCreateContact, useImportContacts, useListConversations, getListConversationsQueryKey, customFetch } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, Pencil, Plus, Upload, Download, AlertCircle, CheckCircle, MessageCircle, Camera, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";

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

type ImportResult = {
  created: number;
  updated: number;
  errors: { row?: number; message?: string }[];
};

const ITEMS_PER_PAGE = 15;

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle className="h-4 w-4" />,
  instagram: <Camera className="h-4 w-4" />,
  facebook: <MessageSquare className="h-4 w-4" />,
};

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactDto | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", customFields: "" });

  // Add Contact state
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "", email: "", channelType: "whatsapp" });
  const [addError, setAddError] = useState("");

  // Import state
  const [importOpen, setImportOpen] = useState(false);
  const [importChannelType, setImportChannelType] = useState("whatsapp");
  const [importData, setImportData] = useState<{ name: string; phone: string; email?: string }[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // WhatsApp button state
  const [helloConfirmContact, setHelloConfirmContact] = useState<ContactDto | null>(null);
  const [isSendingHello, setIsSendingHello] = useState(false);

  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { data: contacts, isLoading } = useListContacts({});
  const updateContact = useUpdateContact();
  const createContact = useCreateContact();
  const importContacts = useImportContacts();

  // Fetch active conversations (last 24h)
  const listConvsParams = { daysOld: 1 };
  const { data: conversationsData } = useListConversations(
    listConvsParams,
    { query: { refetchInterval: 10000, queryKey: getListConversationsQueryKey(listConvsParams) } }
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filtered = contacts?.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const totalPages = Math.ceil((filtered?.length || 0) / ITEMS_PER_PAGE);
  const paginatedContacts = filtered?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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

  const handleAddContact = () => {
    setAddError("");
    if (!addForm.name.trim()) {
      setAddError("Name is required");
      return;
    }
    if (!addForm.phone.trim()) {
      setAddError("Phone number is required");
      return;
    }

    createContact.mutate(
      {
        data: {
          name: addForm.name.trim(),
          phone: addForm.phone.trim(),
          email: addForm.email.trim() || null,
          channelType: addForm.channelType as "whatsapp" | "instagram" | "facebook",
          externalId: addForm.phone.trim(),
        },
      },
      {
        onSuccess: () => {
          setAddOpen(false);
          setAddForm({ name: "", phone: "", email: "", channelType: "whatsapp" });
          queryClient.invalidateQueries({ queryKey: ["listContacts"] });
        },
        onError: (err) => {
          setAddError(err.message || "Failed to create contact");
        },
      }
    );
  };

  const handleChannelAction = (contact: ContactDto) => {
    if (contact.channelType !== "whatsapp") return;

    // Find existing active conversation for this contact
    const existingConv = conversationsData?.items?.find((conv) => {
      const contactPhone = contact.phone?.replace(/[^0-9]/g, "");
      const convPhone = conv.contact?.phone?.replace(/[^0-9]/g, "") || conv.contact?.externalId?.replace(/[^0-9]/g, "");
      return convPhone === contactPhone && conv.channelType === "whatsapp";
    });

    if (existingConv && (existingConv.status === "open" || existingConv.status === "pending")) {
      sessionStorage.setItem("openConversationId", String(existingConv.id));
      navigate("/inbox");
    } else {
      setHelloConfirmContact(contact);
    }
  };

  const handleSendHello = async () => {
    if (!helloConfirmContact) return;
    const contact = helloConfirmContact;
    setHelloConfirmContact(null);
    setIsSendingHello(true);

    try {
      const result = await customFetch<{ success: boolean; messageId?: string; conversationId?: number; messageRecordId?: number }>(
        "/api/send-hello",
        {
          method: "POST",
          body: JSON.stringify({ contactId: contact.id }),
        }
      );

      await queryClient.invalidateQueries({ queryKey: ["listConversations"] });
      const newConvId = result?.conversationId;
      if (newConvId) {
        sessionStorage.setItem("openConversationId", String(newConvId));
      }
      navigate("/inbox");
    } finally {
      setIsSendingHello(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    setImportResult(null);
    setImportError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(line => line.trim());

      if (lines.length < 2) {
        setImportError("CSV file must have a header row and at least one data row");
        return;
      }

      // Parse header
      const header = lines[0].toLowerCase().split(",").map(h => h.trim());
      const nameIdx = header.findIndex(h => h === "name");
      const phoneIdx = header.findIndex(h => h === "phone");
      const emailIdx = header.findIndex(h => h === "email");

      if (nameIdx === -1 || phoneIdx === -1) {
        setImportError("CSV must have 'name' and 'phone' columns");
        return;
      }

      // Parse data rows
      const data: { name: string; phone: string; email?: string }[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        if (cols.length > Math.max(nameIdx, phoneIdx)) {
          data.push({
            name: cols[nameIdx],
            phone: cols[phoneIdx],
            email: emailIdx !== -1 ? cols[emailIdx] : undefined,
          });
        }
      }

      setImportData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (importData.length === 0) return;

    setImportError("");
    importContacts.mutate(
      {
        data: {
          channelType: importChannelType as "whatsapp" | "instagram" | "facebook",
          contacts: importData,
        },
      },
      {
        onSuccess: (result) => {
          setImportResult(result);
          queryClient.invalidateQueries({ queryKey: ["listContacts"] });
        },
        onError: (err) => {
          setImportError(err.message || "Failed to import contacts");
        },
      }
    );
  };

  const downloadTemplate = () => {
    const csv = "name,phone,email\nJohn Doe,6281234567890,john@example.com\nJane Smith,6289876543210,jane@example.com";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Manage your customer directory</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4 mr-1.5" />
            Import
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Contact
          </Button>
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
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[280px]">Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>External ID</TableHead>
              <TableHead className="w-[120px]"></TableHead>
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
              paginatedContacts?.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium cursor-pointer" onClick={() => handleEdit(contact)}>
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
                  <TableCell className="cursor-pointer" onClick={() => handleEdit(contact)}>
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
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {CHANNEL_ICONS[contact.channelType] && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={() => handleChannelAction(contact)}
                          title={`Open in ${contact.channelType === "whatsapp" ? "WhatsApp" : contact.channelType === "instagram" ? "Instagram" : "Facebook"}`}
                        >
                          {CHANNEL_ICONS[contact.channelType]}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(contact)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && filtered && filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} contacts
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 5) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, page, i, arr) => {
                  if (i > 0 && page - (arr[i - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(page);
                  return acc;
                }, [])
                .map((item, i) => (
                  <PaginationItem key={i}>
                    {item === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        isActive={item === currentPage}
                        onClick={() => setCurrentPage(item as number)}
                        className="cursor-pointer"
                      >
                        {item}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))
              }
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Send Hello Confirmation Dialog */}
      <Dialog open={helloConfirmContact !== null} onOpenChange={(open) => { if (!open) setHelloConfirmContact(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Hello Message</DialogTitle>
            <DialogDescription>
              No active conversation found with {helloConfirmContact?.name || "this contact"}.
              Would you like to send a greeting message via WhatsApp?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-sm text-muted-foreground">
            A "Hello" message will be sent using the <strong>sapa_customer</strong> template.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHelloConfirmContact(null)}>Cancel</Button>
            <Button onClick={handleSendHello} disabled={isSendingHello}>
              {isSendingHello ? "Sending..." : "Yes, Send Hello"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a new contact to your directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {addError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {addError}
              </div>
            )}
            <div>
              <Label>Channel <span className="text-destructive">*</span></Label>
              <Select value={addForm.channelType} onValueChange={(v) => setAddForm(f => ({ ...f, channelType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
            </div>
            <div>
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="6281234567890" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="john@example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddContact} disabled={createContact.isPending}>
              {createContact.isPending ? "Adding..." : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg max-w-[calc(100vw-2rem)] overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>Import contacts from a CSV file. Existing phone numbers will only have their name updated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 max-w-full">
            {importError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {importError}
              </div>
            )}
            {importResult && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Import completed successfully!
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>{importResult.created} contacts created</p>
                  <p>{importResult.updated} contacts updated (name only)</p>
                  {importResult.errors.length > 0 && (
                    <p className="text-destructive">{importResult.errors.length} errors</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <Label>Channel <span className="text-destructive">*</span></Label>
              <Select value={importChannelType} onValueChange={setImportChannelType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>CSV File</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="max-w-full">
                  <Upload className="w-4 h-4 mr-1.5 shrink-0" />
                  <span className="truncate">{csvFileName || "Choose CSV file"}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" />
                  Template
                </Button>
              </div>
            </div>
            {importData.length > 0 && (
              <div>
                <Label>Preview ({importData.length} contacts)</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto overflow-x-hidden">
                  <table className="w-full text-sm table-fixed">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 w-[30%]">Name</th>
                        <th className="text-left p-2 w-[35%]">Phone</th>
                        <th className="text-left p-2 w-[35%]">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 truncate">{row.name}</td>
                          <td className="p-2 font-mono text-xs break-all">{row.phone}</td>
                          <td className="p-2 text-muted-foreground truncate">{row.email || "-"}</td>
                        </tr>
                      ))}
                      {importData.length > 10 && (
                        <tr>
                          <td colSpan={3} className="p-2 text-center text-muted-foreground">
                            ...and {importData.length - 10} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setImportOpen(false); setImportData([]); setImportResult(null); setCsvFileName(""); }}>Cancel</Button>
            <Button onClick={handleImport} disabled={importData.length === 0 || importContacts.isPending}>
              {importContacts.isPending ? "Importing..." : `Import ${importData.length} Contacts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>Update the contact details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editContact && (
              <div className="text-xs text-muted-foreground">
                Created: {new Date(editContact.createdAt).toLocaleString()}
              </div>
            )}
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