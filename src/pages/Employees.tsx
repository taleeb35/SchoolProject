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
import { formatCurrencyPKR } from "@/lib/utils"; // Import currency formatter


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

// Define preferred class order (copy from Classes.tsx or centralize)
const classOrder: { [key: string]: number } = {
  "PG": 1,
  "Nursery": 2,
  "KG": 3,
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
     const { data, error } = await supabase.from("classes").select("id, name") // .order("name"); // Sort manually

     if (error) {
       toast({ variant: "destructive", title: "Error loading classes", description: error.message });
     } else if (data) {
        const sortedData = [...data].sort((a, b) => {
            const orderA = classOrder[a.name] || Infinity;
            const orderB = classOrder[b.name] || Infinity;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
        setClasses(sortedData);
     }
  };


  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`*, employee_classes ( classes ( id, name ) )`)
      .order("name");

    if (error) {
      toast({ variant: "destructive", title: "Error loading employees", description: error.message });
    } else {
       const formattedData = (data || []).map(emp => ({
        ...emp,
        joining_date: emp.joining_date ? new Date(emp.joining_date).toISOString().split("T")[0] : '',
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
    const { data: currentAssignments, error: fetchError } = await supabase
      .from('employee_classes').select('class_id').eq('employee_id', employeeId);
    if (fetchError) return fetchError;
    const currentClassIds = currentAssignments?.map(a => a.class_id) || [];
    const classesToAdd = assignedClassIds.filter(id => !currentClassIds.includes(id));
    const classesToRemove = currentClassIds.filter(id => !assignedClassIds.includes(id));
    if (classesToRemove.length > 0) {
      const { error: deleteError } = await supabase.from('employee_classes').delete().eq('employee_id', employeeId).in('class_id', classesToRemove);
      if (deleteError) return deleteError;
    }
    if (classesToAdd.length > 0) {
      const assignmentsToInsert = classesToAdd.map(classId => ({ employee_id: employeeId, class_id: classId }));
      const { error: insertError } = await supabase.from('employee_classes').insert(assignmentsToInsert);
      if (insertError) return insertError;
    }
     return null; // Success
  };


  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: newEmployeeData, error: insertError } = await supabase
      .from("employees")
      .insert({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      }).select('id').single();

    if (insertError || !newEmployeeData) {
      toast({ variant: "destructive", title: "Error adding employee", description: insertError?.message || "Failed to get new employee ID" });
      return;
    }
    const assignmentError = await syncClassAssignments(newEmployeeData.id, formData.assigned_classes);
     if (assignmentError) {
       toast({ variant: "destructive", title: "Error assigning classes", description: assignmentError.message + ". Employee created, but assignment failed." });
     } else {
      toast({ title: "Success", description: "Employee added successfully" });
      resetForm();
      loadEmployees();
     }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;
    const { error: updateError } = await supabase
      .from("employees")
      .update({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      }).eq("id", formData.id);
     if (updateError) {
       toast({ variant: "destructive", title: "Error updating employee details", description: updateError.message });
       return;
     }
     const assignmentError = await syncClassAssignments(formData.id, formData.assigned_classes);
      if (assignmentError) {
        toast({ variant: "destructive", title: "Error updating class assignments", description: assignmentError.message + ". Details updated, but assignments failed." });
      } else {
       toast({ title: "Success", description: "Employee updated successfully" });
       resetForm();
       loadEmployees();
      }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting employee", description: error.message });
    } else {
      toast({ title: "Success", description: "Employee deleted successfully" });
      loadEmployees();
    }
  };

    const openEditDialog = (employee: Employee) => {
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

  // Common Form Fields Component
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
          <Label htmlFor="salary">Salary (PKR) *</Label>
          <Input id="salary" type="number" step="0.01" value={formData.salary} onChange={handleInputChange} required />
        </div>
        <div className="space-y-2 col-span-2"> {/* Joining date takes full width */}
          <Label htmlFor="joining_date">Joining Date *</Label>
          <Input id="joining_date" type="date" value={formData.joining_date} onChange={handleInputChange} required className="w-full md:w-1/2"/> {/* Adjust width */}
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
                <label htmlFor={`class-${cls.id}`} className="text-sm font-medium leading-none">{cls.name}</label>
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
            <Button onClick={() => setFormData(initialFormData)}><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Employee</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4"><EmployeeFormFields /><DialogFooter><DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose><Button type="submit">Add Employee</Button></DialogFooter></form>
          </DialogContent>
        </Dialog>
      </div>

       {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader><DialogTitle>Edit Employee: {formData.name}</DialogTitle></DialogHeader>
           <form onSubmit={handleEditSubmit} className="space-y-4"><EmployeeFormFields /><DialogFooter><DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose><Button type="submit">Save Changes</Button></DialogFooter></form>
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
              <TableHead>Salary (PKR)</TableHead>
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
                    {/* Display formatted currency */}
                    <TableCell>{formatCurrencyPKR(employee.salary)}</TableCell>
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
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(employee)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
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