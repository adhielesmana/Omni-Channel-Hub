import { useState } from "react";
import { useListDepartments, useCreateDepartment } from "@workspace/api-client-react";
import { DepartmentInputRoutingMode } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function Departments() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", routingMode: DepartmentInputRoutingMode.manual as string });
  const [error, setError] = useState("");

  const queryClient = useQueryClient();
  const { data: departments, isLoading } = useListDepartments();
  const createDepartment = useCreateDepartment();

  const handleSubmit = () => {
    if (!form.name.trim()) {
      setError("Department name is required.");
      return;
    }
    setError("");
    createDepartment.mutate(
      {
        data: {
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          routingMode: form.routingMode as typeof DepartmentInputRoutingMode[keyof typeof DepartmentInputRoutingMode],
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
          setOpen(false);
          setForm({ name: "", description: "", routingMode: DepartmentInputRoutingMode.manual });
        },
        onError: () => setError("Failed to create department. Please try again."),
      }
    );
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage routing and organizational units</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Create Department
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center p-12 text-muted-foreground">Loading departments...</div>
      ) : departments?.length === 0 ? (
        <div className="text-center p-12 border rounded-xl bg-card border-dashed">
          <Building className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="font-semibold mb-1">No departments</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first department to start routing conversations.</p>
          <Button variant="outline" onClick={() => setOpen(true)}>Create Department</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments?.map((dept) => (
            <Card key={dept.id} className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                  <Badge variant={dept.isActive ? 'default' : 'secondary'}>
                    {dept.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <CardDescription className="line-clamp-2 h-10 mt-2">
                  {dept.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-sm mt-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Routing Mode</span>
                    <span className="capitalize font-medium">{dept.routingMode.replace('_', ' ')}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">Members</span>
                    <span className="font-medium">{dept.memberCount || 0} Agents</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Department</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-1.5">
              <Label>Department name</Label>
              <Input
                placeholder="e.g. Customer Support"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                placeholder="Brief description of this department's purpose..."
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Routing mode</Label>
              <Select value={form.routingMode} onValueChange={v => setForm(f => ({ ...f, routingMode: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DepartmentInputRoutingMode.manual}>Manual — assign conversations manually</SelectItem>
                  <SelectItem value={DepartmentInputRoutingMode.round_robin}>Round Robin — auto-assign evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createDepartment.isPending}>
              {createDepartment.isPending ? "Creating..." : "Create Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
