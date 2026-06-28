import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useListDepartments, useResetUserPassword, useDeleteUser } from "@workspace/api-client-react";
import { UserInputRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { UserCircle, UserPlus, Search, Pencil, Key, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserDto = {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  role: string;
  departmentId?: number | null;
  isActive: boolean;
  createdAt: string;
};

export default function Users() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: UserInputRole.agent as string, departmentId: "" });
  const [error, setError] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserDto | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: UserInputRole.agent as string, departmentId: "", isActive: "true" });
  const [editError, setEditError] = useState("");

  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const { data: departments } = useListDepartments();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetUserPassword = useResetUserPassword();
  const deleteUser = useDeleteUser();

  const filtered = users?.filter(u =>
    !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setError("");
    setCreatedPassword(null);
    createUser.mutate(
      {
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role as typeof UserInputRole[keyof typeof UserInputRole],
          departmentId: form.departmentId ? Number(form.departmentId) : undefined,
        }
      },
      {
        onSuccess: (data: any) => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          if (data.temporaryPassword) {
            setCreatedPassword(data.temporaryPassword);
          } else {
            setOpen(false);
            setForm({ name: "", email: "", role: UserInputRole.agent, departmentId: "" });
          }
        },
        onError: () => setError("Failed to create user. Please try again."),
      }
    );
  };

  const handleEdit = (user: UserDto) => {
    setEditUser(user);
    setEditForm({
      name: user.name || "",
      role: user.role,
      departmentId: user.departmentId ? String(user.departmentId) : "",
      isActive: user.isActive ? "true" : "false",
    });
    setEditError("");
    setEditOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editUser) return;
    if (!editForm.name.trim()) {
      setEditError("Name is required.");
      return;
    }
    setEditError("");
    updateUser.mutate(
      {
        id: editUser.id,
        data: {
          name: editForm.name.trim(),
          role: editForm.role as typeof UserInputRole[keyof typeof UserInputRole],
          departmentId: editForm.departmentId ? Number(editForm.departmentId) : null,
          isActive: editForm.isActive === "true",
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setEditOpen(false);
          setEditUser(null);
        },
        onError: () => setEditError("Failed to update user. Please try again."),
      }
    );
  };

  const handleDelete = (userId: number) => {
    deleteUser.mutate(
      { id: userId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users"] });
          setDeleteConfirmId(null);
        },
        onError: () => setError("Failed to delete user."),
      }
    );
  };

  const handleResetPassword = (userId: number) => {
    setResetPassword(null);
    resetUserPassword.mutate(
      { id: userId },
      {
        onSuccess: (data: any) => {
          setResetPassword(data.temporaryPassword);
          setResetUserId(userId);
        },
        onError: () => setError("Failed to reset password."),
      }
    );
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const closeCreateDialog = () => {
    setOpen(false);
    setCreatedPassword(null);
    setForm({ name: "", email: "", role: UserInputRole.agent, departmentId: "" });
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-1 text-sm hidden md:block">Manage agents, supervisors, and administrators</p>
        </div>
        <Button className="gap-2" size="sm" onClick={() => setOpen(true)}>
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Invite User</span>
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden flex-1 flex flex-col shadow-sm">
        <div className="p-3 md:p-4 border-b flex items-center justify-between bg-muted/20">
          <div className="relative w-56 md:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-9 h-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[280px]">User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Joined</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading users...</TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  {search ? `No users matching "${search}"` : (
                    <div className="flex flex-col items-center gap-3">
                      <UserCircle className="w-10 h-10 opacity-20" />
                      <span>No team members yet</span>
                      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Invite User</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((user) => {
                const dept = departments?.find(d => d.id === user.departmentId);
                const showReset = resetUserId === user.id && resetPassword;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                            {user.name?.substring(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-xs text-muted-foreground font-normal">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`capitalize ${user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : user.role === 'supervisor' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                        <span className="text-sm">{user.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {dept ? dept.name : <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(user as any).isSuperadmin ? (
                          <span className="text-xs text-muted-foreground italic mr-2">Locked</span>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(user)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(user.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {showReset ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-mono text-amber-600 bg-amber-50 px-2 py-1 rounded max-w-[120px] truncate" title={resetPassword!}>
                                  {resetPassword}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(resetPassword!)}
                                  className="p-1 hover:bg-muted rounded cursor-pointer"
                                  title="Copy password"
                                >
                                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs h-7"
                                onClick={() => handleResetPassword(user.id)}
                                disabled={resetUserPassword.isPending && resetUserId === user.id}
                              >
                                <Key className="w-3 h-3" />
                                Reset
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeCreateDialog(); }}>
        <DialogContent className="sm:max-w-md">
          {createdPassword ? (
            <>
              <DialogHeader>
                <DialogTitle>User Created</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Share this temporary password with the user. They'll need it for their first login.
                </p>
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm font-mono font-bold text-amber-800 flex-1 break-all">{createdPassword}</span>
                  <button
                    onClick={() => copyToClipboard(createdPassword)}
                    className="p-1.5 hover:bg-amber-100 rounded cursor-pointer"
                    title="Copy password"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeCreateDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-2">
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-col gap-1.5">
                  <Label>Full name</Label>
                  <Input
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Email address</Label>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserInputRole.agent}>Agent</SelectItem>
                      <SelectItem value={UserInputRole.supervisor}>Supervisor</SelectItem>
                      <SelectItem value={UserInputRole.admin}>Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Department <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Select value={form.departmentId || "none"} onValueChange={v => setForm(f => ({ ...f, departmentId: v === "none" ? "" : v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No department</SelectItem>
                      {departments?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  A random password will be generated automatically. The user can change it after first login.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreateDialog}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createUser.isPending}>
                  {createUser.isPending ? "Inviting..." : "Send Invite"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>
              {editUser?.email ? `Update details for ${editUser.email}.` : "Update the team member details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex flex-col gap-1.5">
              <Label>Full name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserInputRole.agent}>Agent</SelectItem>
                  <SelectItem value={UserInputRole.supervisor}>Supervisor</SelectItem>
                  <SelectItem value={UserInputRole.admin}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Department <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={editForm.departmentId || "none"} onValueChange={v => setEditForm(f => ({ ...f, departmentId: v === "none" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {departments?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={editForm.isActive} onValueChange={v => setEditForm(f => ({ ...f, isActive: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
