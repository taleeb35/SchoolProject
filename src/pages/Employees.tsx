// src/pages/Employees.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  salary: number;
  joining_date: string; // Keep as YYYY-MM-DD
  created_at: string;
  // For displaying assigned classes
  employee_classes: { classes: { id: string, name: string } }[];
}

interface Class {
  id: string;
  name: string;
}

const initialFormData = {
  id: "",
  name: "",
  phone: "",
  designation: "",
  salary: "",
  joining_date: new Date().toISOString().split("T")[0],
  assigned_classes: [] as string[], // Store IDs of assigned classes
};

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
    loadClasses();
  }, []);

  const loadClasses = async () => {
     const { data, error } = await supabase.from("classes").select("id, name").order("name");
     if (error) {
       toast({ variant: "destructive", title: "Error loading classes", description: error.message });
     } else {
       setClasses(data || []);
     }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        employee_classes (
          classes ( id, name )
        )
      `)
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Error loading employees", description: error.message });
    } else {
       const formattedData = (data || []).map(emp => ({
        ...emp,
        joining_date: emp.joining_date ? new Date(emp.joining_date).toISOString().split("T")[0] : '', // Format date
      }));
      setEmployees(formattedData as Employee[]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

   const handleClassAssignmentChange = (classId: string, checked: boolean | string) => {
     setFormData((prev) => {
       const currentAssigned = prev.assigned_classes;
       if (checked) {
         return { ...prev, assigned_classes: [...currentAssigned, classId] };
       } else {
         return { ...prev, assigned_classes: currentAssigned.filter(id => id !== classId) };
       }
     });
   };

  const resetForm = () => {
    setFormData(initialFormData);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  // Helper to manage class assignments in the junction table
  const syncClassAssignments = async (employeeId: string, assignedClassIds: string[]) => {
    // 1. Get current assignments
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('employee_classes')
      .select('class_id')
      .eq('employee_id', employeeId);

    if (fetchError) {
      console.error("Error fetching current assignments:", fetchError);
      return fetchError; // Propagate error
    }

    const currentClassIds = currentAssignments?.map(a => a.class_id) || [];

    // 2. Determine classes to add and remove
    const classesToAdd = assignedClassIds.filter(id => !currentClassIds.includes(id));
    const classesToRemove = currentClassIds.filter(id => !assignedClassIds.includes(id));

    // 3. Perform deletions
    if (classesToRemove.length > 0) {
      const { error: deleteError } = await supabase
        .from('employee_classes')
        .delete()
        .eq('employee_id', employeeId)
        .in('class_id', classesToRemove);
      if (deleteError) {
         console.error("Error removing assignments:", deleteError);
         return deleteError; // Propagate error
      }
    }

    // 4. Perform insertions
    if (classesToAdd.length > 0) {
      const assignmentsToInsert = classesToAdd.map(classId => ({
        employee_id: employeeId,
        class_id: classId,
      }));
      const { error: insertError } = await supabase
        .from('employee_classes')
        .insert(assignmentsToInsert);
      if (insertError) {
         console.error("Error adding assignments:", insertError);
         return insertError; // Propagate error
      }
    }
     return null; // Success
  };


  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Insert employee data first
    const { data: newEmployeeData, error: insertError } = await supabase
      .from("employees")
      .insert({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      })
      .select('id') // Select the ID of the newly created employee
      .single(); // Expecting a single row back

    if (insertError || !newEmployeeData) {
      toast({ variant: "destructive", title: "Error adding employee", description: insertError?.message || "Failed to get new employee ID" });
      return;
    }

    const newEmployeeId = newEmployeeData.id;

    // Now handle class assignments
    const assignmentError = await syncClassAssignments(newEmployeeId, formData.assigned_classes);

     if (assignmentError) {
       // Attempt to rollback or notify user about partial success/failure
       toast({ variant: "destructive", title: "Error assigning classes", description: assignmentError.message + ". Employee created, but class assignment failed." });
     } else {
      toast({ title: "Success", description: "Employee added successfully" });
      resetForm();
      loadEmployees(); // Reload to show new employee and assignments
     }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;

    // 1. Update employee details
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      })
      .eq("id", formData.id);

     if (updateError) {
       toast({ variant: "destructive", title: "Error updating employee details", description: updateError.message });
       return;
     }

     // 2. Sync class assignments
     const assignmentError = await syncClassAssignments(formData.id, formData.assigned_classes);

      if (assignmentError) {
        toast({ variant: "destructive", title: "Error updating class assignments", description: assignmentError.message + ". Employee details updated, but assignments failed." });
      } else {
       toast({ title: "Success", description: "Employee updated successfully" });
       resetForm();
       loadEmployees();
      }
  };


  const handleDelete = async (id: string) => {
     // Deleting employee will cascade delete related employee_classes due to FK constraint
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting employee", description: error.message });
    } else {
      toast({ title: "Success", description: "Employee deleted successfully" });
      loadEmployees();
    }
  };

    const openEditDialog = (employee: Employee) => {
     // Extract assigned class IDs
     const assignedIds = employee.employee_classes?.map(ec => ec.classes.id) || [];

    setFormData({
      id: employee.id,
      name: employee.name,
      phone: employee.phone || "",
      designation: employee.designation || "",
      salary: employee.salary.toString(),
      joining_date: employee.joining_date,
      assigned_classes: assignedIds,
    });
    setIsEditDialogOpen(true);
  };


  // Common Form Fields Component (Optional but recommended for DRY)
  const EmployeeFormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Employee Name *</Label>
          <Input id="name" value={formData.name} onChange={handleInputChange} required />
        </div>
         <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input id="designation" value={formData.designation} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Salary *</Label>
          <Input id="salary" type="number" step="0.01" value={formData.salary} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="joining_date">Joining Date *</Label>
          <Input id="joining_date" type="date" value={formData.joining_date} onChange={handleInputChange} required />
        </div>
      </div>
       <div className="space-y-2">
          <Label>Assign Classes</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border p-3 rounded-md max-h-40 overflow-y-auto">
            {classes.length > 0 ? classes.map((cls) => (
              <div key={cls.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`class-${cls.id}`}
                  checked={formData.assigned_classes.includes(cls.id)}
                  onCheckedChange={(checked) => handleClassAssignmentChange(cls.id, checked)}
                />
                <label
                  htmlFor={`class-${cls.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {cls.name}
                </label>
              </div>
            )) : <p className="text-sm text-muted-foreground col-span-full">No classes available.</p>}
          </div>
        </div>
    </>
  );


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage school staff</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
                <EmployeeFormFields />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Edit Employee: {formData.name}</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleEditSubmit} className="space-y-4">
              <EmployeeFormFields />
             <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
               <Button type="submit">Save Changes</Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>

      {/* Employee Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joining Date</TableHead>
               <TableHead>Assigned Classes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
                employees.map((employee) => (
                <TableRow key={employee.id}>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.designation || "-"}</TableCell>
                    <TableCell>{employee.phone || "-"}</TableCell>
                    <TableCell>${employee.salary.toFixed(2)}</TableCell>
                    <TableCell>{employee.joining_date ? new Date(employee.joining_date + 'T00:00:00').toLocaleDateString() : "-"}</TableCell>
                     <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {employee.employee_classes?.length > 0
                          ? employee.employee_classes.map(ec => (
                              <Badge key={ec.classes.id} variant="secondary">{ec.classes.name}</Badge>
                            ))
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(employee.id)}
                        className="text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center">No employees found.</TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Employees;