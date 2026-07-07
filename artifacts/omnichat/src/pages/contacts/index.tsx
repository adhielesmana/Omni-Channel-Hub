import { useState, useRef, useMemo } from "react";
import { useListContacts, useUpdateContact, useCreateContact, useImportContacts } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Pencil, Plus, Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
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

export default function Contacts() {
  const [search, setSearch] = useState("");
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

  const queryClient = useQueryClient();
  const { data: contacts, isLoading } = useListContacts({});
  const updateContact = useUpdateContact();
  const createContact = useCreateContact();
  const importContacts = useImportContacts();

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Contacts</DialogTitle>
            <DialogDescription>Import contacts from a CSV file. Existing phone numbers will only have their name updated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Label>CSV File</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1.5" />
                  {csvFileName || "Choose CSV file"}
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
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Phone</th>
                        <th className="text-left p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 10).map((row, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2 font-mono text-xs">{row.phone}</td>
                          <td className="p-2 text-muted-foreground">{row.email || "-"}</td>
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
