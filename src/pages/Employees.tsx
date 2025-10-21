import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sortClasses } from "@/lib/classUtils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Employee {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  salary: number;
  joining_date: string;
  created_at: string;
  employee_classes: { classes: { id: string; name: string } }[];
}

interface Class {
  id: string;
  name: string;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    designation: "",
    salary: "",
    joining_date: new Date().toISOString().split("T")[0],
    class_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadEmployees();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading classes",
        description: error.message,
      });
    } else {
      setClasses(sortClasses(data || []));
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select(`
        *,
        employee_classes (
          classes (
            id,
            name
          )
        )
      `)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading employees",
        description: error.message,
      });
    } else {
      setEmployees(data as Employee[]);
    }
  };

  const resetFormData = () => {
    setFormData({
      name: "",
      phone: "",
      designation: "",
      salary: "",
      joining_date: new Date().toISOString().split("T")[0],
      class_id: "",
    });
    setCurrentEmployee(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: newEmployee, error: insertError } = await supabase
      .from("employees")
      .insert({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      })
      .select()
      .single();

    if (insertError || !newEmployee) {
      toast({
        variant: "destructive",
        title: "Error creating employee",
        description: insertError?.message,
      });
      return;
    }

    // Assign class if selected
    if (formData.class_id) {
      const { error: assignError } = await supabase
        .from("employee_classes")
        .insert({
          employee_id: newEmployee.id,
          class_id: formData.class_id,
        });

      if (assignError) {
        toast({
          variant: "destructive",
          title: "Error assigning class",
          description: assignError.message,
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "Employee created successfully",
    });
    resetFormData();
    setIsAddDialogOpen(false);
    loadEmployees();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmployee) return;

    const { error: updateError } = await supabase
      .from("employees")
      .update({
        name: formData.name,
        phone: formData.phone || null,
        designation: formData.designation || null,
        salary: parseFloat(formData.salary) || 0,
        joining_date: formData.joining_date,
      })
      .eq("id", currentEmployee.id);

    if (updateError) {
      toast({
        variant: "destructive",
        title: "Error updating employee",
        description: updateError.message,
      });
      return;
    }

    // Update class assignment
    // First delete existing assignments
    await supabase
      .from("employee_classes")
      .delete()
      .eq("employee_id", currentEmployee.id);

    // Then add new assignment if selected
    if (formData.class_id) {
      const { error: assignError } = await supabase
        .from("employee_classes")
        .insert({
          employee_id: currentEmployee.id,
          class_id: formData.class_id,
        });

      if (assignError) {
        toast({
          variant: "destructive",
          title: "Error assigning class",
          description: assignError.message,
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "Employee updated successfully",
    });
    resetFormData();
    setIsEditDialogOpen(false);
    loadEmployees();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("employees").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting employee",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      loadEmployees();
    }
  };

  const openEditDialog = (employee: Employee) => {
    setCurrentEmployee(employee);
    const assignedClassId = employee.employee_classes?.[0]?.classes?.id || "";
    setFormData({
      name: employee.name,
      phone: employee.phone || "",
      designation: employee.designation || "",
      salary: employee.salary.toString(),
      joining_date: employee.joining_date,
      class_id: assignedClassId,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage school staff</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetFormData}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">Employee Name</Label>
                  <Input
                    id="add-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-designation">Designation</Label>
                  <Input
                    id="add-designation"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">Phone</Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-salary">Salary</Label>
                  <Input
                    id="add-salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-joining_date">Joining Date</Label>
                  <Input
                    id="add-joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-class">Assign Class</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Employee</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Assigned Class</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length > 0 ? (
              employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.designation || "-"}</TableCell>
                  <TableCell>{employee.phone || "-"}</TableCell>
                  <TableCell>PKR {employee.salary.toLocaleString('en-PK')}</TableCell>
                  <TableCell>{new Date(employee.joining_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {employee.employee_classes?.[0]?.classes?.name || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(employee)}
                    >
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
                <TableCell colSpan={7} className="text-center">
                  No employees found. Add a new employee to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Employee: {currentEmployee?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Employee Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-salary">Salary</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-joining_date">Joining Date</Label>
                <Input
                  id="edit-joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">Assign Class</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" onClick={resetFormData}>Cancel</Button>
              </DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Employees;
