// src/pages/Students.tsx
import { useEffect, useState, useMemo } from "react"; // Added useMemo
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
import { formatCurrencyPKR } from "@/lib/utils"; // Import currency formatter


interface Student {
  id: string;
  first_name: string; // Updated
  last_name: string | null; // Updated
  phone: string | null;
  father_name: string | null;
  total_fee: number;
  joining_date: string; // Keep as string (YYYY-MM-DD) for input compatibility
  class_id: string;
  classes: { name: string } | null;
}

interface Class {
  id: string;
  name: string;
}

// Define preferred class order (copy from Classes.tsx or centralize)
const classOrder: { [key: string]: number } = {
  "PG": 1,
  "Nursery": 2,
  "KG": 3,
};


const initialFormData = {
  id: "", // Add id for editing
  first_name: "", // Updated
  last_name: "",  // Updated
  phone: "",
  father_name: "",
  total_fee: "",
  joining_date: new Date().toISOString().split("T")[0],
  class_id: "",
};

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const { toast } = useToast();

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      // .order("name"); // Sort manually

    if (!error && data) {
       const sortedData = [...data].sort((a, b) => {
        const orderA = classOrder[a.name] || Infinity;
        const orderB = classOrder[b.name] || Infinity;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      setClasses(sortedData);
    } else if (error) {
       toast({ variant: "destructive", title: "Error loading classes", description: error.message });
    }
  };

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*, classes ( name )")
      .order("first_name").order("last_name"); // Order by name

    if (error) {
      console.error("Error loading students:", error);
      toast({ variant: "destructive", title: "Error loading students", description: error.message });
    } else {
      const formattedData = (data || []).map(student => ({
        ...student,
        joining_date: student.joining_date ? new Date(student.joining_date).toISOString().split("T")[0] : '',
        classes: student.classes || { name: 'N/A' }
      }));
      setStudents(formattedData as Student[]);
    }
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, class_id: value }));
  };

   const resetForm = () => {
    setFormData(initialFormData);
    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!formData.class_id) {
       toast({ variant: "destructive", title: "Validation Error", description: "Please select a class." });
       return;
     }

    const { error } = await supabase.from("students").insert({
      first_name: formData.first_name, // Updated
      last_name: formData.last_name || null, // Updated
      phone: formData.phone || null,
      father_name: formData.father_name || null,
      total_fee: parseFloat(formData.total_fee) || 0,
      joining_date: formData.joining_date,
      class_id: formData.class_id,
    });

    if (error) {
      toast({ variant: "destructive", title: "Error adding student", description: error.message });
    } else {
      toast({ title: "Success", description: "Student added successfully" });
      resetForm();
      loadStudents();
    }
  };

 const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
     if (!formData.id) return;
      if (!formData.class_id) {
       toast({ variant: "destructive", title: "Validation Error", description: "Please select a class." });
       return;
     }

    const { error } = await supabase
      .from("students")
      .update({
        first_name: formData.first_name, // Updated
        last_name: formData.last_name || null, // Updated
        phone: formData.phone || null,
        father_name: formData.father_name || null,
        total_fee: parseFloat(formData.total_fee) || 0,
        joining_date: formData.joining_date,
        class_id: formData.class_id,
      })
      .eq("id", formData.id);

    if (error) {
      toast({ variant: "destructive", title: "Error updating student", description: error.message });
    } else {
      toast({ title: "Success", description: "Student updated successfully" });
      resetForm();
      loadStudents();
    }
  };

  const handleDelete = async (id: string) => {
    // Optional: Confirmation Dialog
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting student", description: error.message });
    } else {
      toast({ title: "Success", description: "Student deleted successfully" });
      loadStudents();
    }
  };

   const openEditDialog = (student: Student) => {
    setFormData({
      id: student.id,
      first_name: student.first_name, // Updated
      last_name: student.last_name || "", // Updated
      phone: student.phone || "",
      father_name: student.father_name || "",
      total_fee: student.total_fee.toString(),
      joining_date: student.joining_date, // Already formatted
      class_id: student.class_id,
    });
    setIsEditDialogOpen(true);
  };

  // Student Form Fields Component
   const StudentFormFields = () => (
     <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
         <Label htmlFor="first_name">First Name *</Label>
         <Input id="first_name" value={formData.first_name} onChange={handleInputChange} required />
       </div>
       <div className="space-y-2">
         <Label htmlFor="last_name">Last Name</Label>
         <Input id="last_name" value={formData.last_name} onChange={handleInputChange} />
       </div>
       <div className="space-y-2">
         <Label htmlFor="class">Class *</Label>
         <Select value={formData.class_id} onValueChange={handleSelectChange} required>
           <SelectTrigger id="class">
             <SelectValue placeholder="Select class" />
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
       <div className="space-y-2">
         <Label htmlFor="phone">Phone</Label>
         <Input id="phone" type="tel" value={formData.phone} onChange={handleInputChange} />
       </div>
       <div className="space-y-2">
         <Label htmlFor="father_name">Father Name</Label>
         <Input id="father_name" value={formData.father_name} onChange={handleInputChange} />
       </div>
       <div className="space-y-2">
         <Label htmlFor="total_fee">Specific Fee (PKR)</Label>
         <Input id="total_fee" type="number" step="0.01" placeholder="Overrides class fee" value={formData.total_fee} onChange={handleInputChange} />
         <p className="text-xs text-muted-foreground">Leave blank or 0 to use the default class fee.</p>
       </div>
       <div className="space-y-2 col-span-2"> {/* Joining date takes full width */}
         <Label htmlFor="joining_date">Joining Date *</Label>
         <Input id="joining_date" type="date" value={formData.joining_date} onChange={handleInputChange} required className="w-full md:w-1/2"/> {/* Adjust width */}
       </div>
     </div>
   );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage your school students</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
             <Button onClick={() => setFormData(initialFormData)}>
              <Plus className="h-4 w-4 mr-2" /> Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Add New Student</DialogTitle></DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
               <StudentFormFields />
              <DialogFooter>
                 <DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
                <Button type="submit">Add Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       {/* Edit Dialog */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader><DialogTitle>Edit Student: {formData.first_name}</DialogTitle></DialogHeader>
           <form onSubmit={handleEditSubmit} className="space-y-4">
              <StudentFormFields />
             <DialogFooter>
               <DialogClose asChild><Button type="button" variant="outline" onClick={resetForm}>Cancel</Button></DialogClose>
               <Button type="submit">Save Changes</Button>
             </DialogFooter>
           </form>
         </DialogContent>
       </Dialog>


      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Father Name</TableHead>
              <TableHead>Fee (PKR)</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
                students.map((student) => (
                <TableRow key={student.id}>
                    <TableCell>{student.first_name} {student.last_name || ''}</TableCell>
                    <TableCell>{student.classes?.name || 'N/A'}</TableCell>
                    <TableCell>{student.phone || "-"}</TableCell>
                    <TableCell>{student.father_name || "-"}</TableCell>
                    {/* Display formatted currency */}
                    <TableCell>{formatCurrencyPKR(student.total_fee)}</TableCell>
                    <TableCell>
                    {student.joining_date ? new Date(student.joining_date + 'T00:00:00').toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    </TableCell>
                </TableRow>
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center">No students found.</TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Students;