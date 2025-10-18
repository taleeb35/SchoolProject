// src/pages/Students.tsx
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

interface Student {
  id: string;
  name: string;
  phone: string | null;
  father_name: string | null;
  total_fee: number;
  joining_date: string; // Keep as string (YYYY-MM-DD) for input compatibility
  class_id: string;
  classes: { name: string } | null; // Allow null temporarily
}

interface Class {
  id: string;
  name: string;
}

const initialFormData = {
  id: "", // Add id for editing
  name: "",
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
      .order("name");

    if (error) {
       toast({ variant: "destructive", title: "Error loading classes", description: error.message });
    } else {
      setClasses(data || []);
    }
  };

  const loadStudents = async () => {
    // Ensure 'classes(name)' is selected correctly
    const { data, error } = await supabase
      .from("students")
      .select("*, classes ( name )") // Correct syntax for relationship
      .order("name");

    if (error) {
      console.error("Error loading students:", error);
      toast({
        variant: "destructive",
        title: "Error loading students",
        description: error.message,
      });
    } else {
      // Ensure data format is correct, handle null classes if necessary
      const formattedData = (data || []).map(student => ({
        ...student,
        joining_date: student.joining_date ? new Date(student.joining_date).toISOString().split("T")[0] : '', // Format date
        classes: student.classes || { name: 'N/A' } // Handle potential null relation
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
      name: formData.name,
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
        name: formData.name,
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
      name: student.name,
      phone: student.phone || "",
      father_name: student.father_name || "",
      total_fee: student.total_fee.toString(),
      joining_date: student.joining_date, // Already formatted
      class_id: student.class_id,
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage your school students</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
             <Button onClick={() => setFormData(initialFormData)}> {/* Reset form on opening Add */}
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
               {/* Form Fields (same structure as below) */}
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="name">Student Name *</Label>
                   <Input id="name" value={formData.name} onChange={handleInputChange} required />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="class">Class *</Label>
                   <Select value={formData.class_id} onValueChange={handleSelectChange}>
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
                   <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="father_name">Father Name</Label>
                   <Input id="father_name" value={formData.father_name} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="total_fee">Total Fee *</Label>
                   <Input id="total_fee" type="number" step="0.01" value={formData.total_fee} onChange={handleInputChange} required />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="joining_date">Joining Date *</Label>
                   <Input id="joining_date" type="date" value={formData.joining_date} onChange={handleInputChange} required />
                 </div>
               </div>
              <DialogFooter>
                 <DialogClose asChild>
                   <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                 </DialogClose>
                <Button type="submit">Add Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

       {/* Edit Dialog - Separate from Add Dialog state */}
       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
         <DialogContent className="max-w-2xl">
           <DialogHeader>
             <DialogTitle>Edit Student: {formData.name}</DialogTitle>
           </DialogHeader>
           <form onSubmit={handleEditSubmit} className="space-y-4">
             {/* Re-use the same form field structure as above */}
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="name">Student Name *</Label>
                   <Input id="name" value={formData.name} onChange={handleInputChange} required />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="class">Class *</Label>
                   <Select value={formData.class_id} onValueChange={handleSelectChange}>
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
                   <Input id="phone" value={formData.phone} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="father_name">Father Name</Label>
                   <Input id="father_name" value={formData.father_name} onChange={handleInputChange} />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="total_fee">Total Fee *</Label>
                   <Input id="total_fee" type="number" step="0.01" value={formData.total_fee} onChange={handleInputChange} required />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="joining_date">Joining Date *</Label>
                   <Input id="joining_date" type="date" value={formData.joining_date} onChange={handleInputChange} required />
                 </div>
               </div>
             <DialogFooter>
               <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                </DialogClose>
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
              <TableHead>Total Fee</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length > 0 ? (
                students.map((student) => (
                <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    {/* Ensure student.classes exists before accessing name */}
                    <TableCell>{student.classes?.name || 'N/A'}</TableCell>
                    <TableCell>{student.phone || "-"}</TableCell>
                    <TableCell>{student.father_name || "-"}</TableCell>
                    <TableCell>${student.total_fee.toFixed(2)}</TableCell>
                    <TableCell>
                    {student.joining_date ? new Date(student.joining_date + 'T00:00:00').toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student.id)}
                        className="text-destructive hover:text-destructive"
                    >
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