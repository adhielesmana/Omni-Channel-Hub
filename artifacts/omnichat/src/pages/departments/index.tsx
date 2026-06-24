import { useListDepartments } from "@workspace/api-client-react";
import { Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Departments() {
  const { data: departments, isLoading } = useListDepartments();

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground mt-1">Manage routing and organizational units</p>
        </div>
        <Button className="gap-2">
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
          <Button variant="outline">Create Department</Button>
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
    </div>
  );
}
