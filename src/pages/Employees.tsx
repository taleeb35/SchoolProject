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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Search } from "lucide-react";

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
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
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
      setFilteredEmployees(data as Employee[]);
    }
  };

  // Filter employees based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
      setCurrentPage(1);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.designation?.toLowerCase().includes(query) ||
        employee.phone?.toLowerCase().includes(query) ||
        employee.employee_classes?.[0]?.classes?.name.toLowerCase().includes(query)
    );
    setFilteredEmployees(filtered);
    setCurrentPage(1);
  }, [searchQuery, employees, itemsPerPage]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

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

      {/* Search Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, designation, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-32">
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="75">75</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          Showing {currentEmployees.length} of {filteredEmployees.length} employees
        </p>
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
            {currentEmployees.length > 0 ? (
              currentEmployees.map((employee) => (
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
                  {searchQuery ? "No employees match your search." : "No employees found. Add a new employee to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => setCurrentPage(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
