// src/pages/Classes.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface Class {
  id: string;
  name: string;
  description: string | null;
  monthly_fee: number; // Added field
  created_at: string;
}

const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "", monthly_fee: "" }); // Added monthly_fee
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading classes",
        description: error.message,
      });
    } else {
      // Sort classes: PG first, then Nursery, then alphabetically
      const sortedData = (data || []).sort((a, b) => {
        if (a.name.toLowerCase().includes('pg')) return -1;
        if (b.name.toLowerCase().includes('pg')) return 1;
        if (a.name.toLowerCase().includes('nursery')) return -1;
        if (b.name.toLowerCase().includes('nursery')) return 1;
        return a.name.localeCompare(b.name);
      });
      setClasses(sortedData);
    }
  };

  const resetFormData = () => {
    setFormData({ name: "", description: "", monthly_fee: "" });
    setCurrentClass(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert({
      name: formData.name,
      description: formData.description || null,
      monthly_fee: parseFloat(formData.monthly_fee) || 0, // Include monthly_fee
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating class",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Class created successfully",
      });
      resetFormData();
      setIsAddDialogOpen(false);
      loadClasses();
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    const { error } = await supabase
      .from("classes")
      .update({
        name: formData.name,
        description: formData.description || null,
        monthly_fee: parseFloat(formData.monthly_fee) || 0, // Include monthly_fee
      })
      .eq("id", currentClass.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating class",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Class updated successfully",
      });
      resetFormData();
      setIsEditDialogOpen(false);
      loadClasses();
    }
  };

  const handleDelete = async (id: string) => {
    // Optional: Add confirmation dialog here
    const { error } = await supabase.from("classes").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting class",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Class deleted successfully",
      });
      loadClasses();
    }
  };

  const openEditDialog = (classItem: Class) => {
    setCurrentClass(classItem);
    setFormData({
      name: classItem.name,
      description: classItem.description || "",
      monthly_fee: classItem.monthly_fee?.toString() || "", // Populate monthly_fee
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage your school classes</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetFormData}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Create New Class</DialogTitle>
             </DialogHeader>
             <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4"> {/* Use grid for layout */}
                 <div className="space-y-2">
                   <Label htmlFor="add-name">Class Name</Label>
                   <Input
                     id="add-name"
                     placeholder="e.g., Nursery, PG, KG"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     required
                   />
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="add-monthly_fee">Monthly Fee</Label>
                  <Input
                    id="add-monthly_fee"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 1500"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                    required
                  />
                </div>
              </div>
               <div className="space-y-2">
                 <Label htmlFor="add-description">Description</Label>
                 <Textarea
                   id="add-description"
                   placeholder="Optional description"
                   value={formData.description}
                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 />
               </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Create Class</Button>
              </DialogFooter>
             </form>
           </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class Name</TableHead>
              <TableHead>Monthly Fee</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.length > 0 ? (
              classes.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell className="font-medium">{classItem.name}</TableCell>
                  <TableCell>PKR {classItem.monthly_fee?.toLocaleString('en-PK') || '0'}</TableCell>
                  <TableCell className="text-right">
                    <Dialog open={isEditDialogOpen && currentClass?.id === classItem.id} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); resetFormData(); } else { openEditDialog(classItem); } }}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(classItem)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      {currentClass?.id === classItem.id && (
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Class: {currentClass.name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-name">Class Name</Label>
                                <Input
                                  id="edit-name"
                                  value={formData.name}
                                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-monthly_fee">Monthly Fee</Label>
                                <Input
                                  id="edit-monthly_fee"
                                  type="number"
                                  step="0.01"
                                  value={formData.monthly_fee}
                                  onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-description">Description</Label>
                              <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              />
                            </div>
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={resetFormData}>Cancel</Button>
                              </DialogClose>
                              <Button type="submit">Save Changes</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      )}
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(classItem.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No classes found. Add a new class to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default Classes;