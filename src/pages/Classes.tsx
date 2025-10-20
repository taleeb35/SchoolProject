// src/pages/Classes.tsx
import React, { useEffect, useState, useMemo } from "react"; // Added useMemo
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
// Removed Textarea import as description is removed
import { formatCurrencyPKR } from "@/lib/utils"; // Import currency formatter

interface Class {
  id: string;
  name: string;
  // description: string | null; // Removed description
  monthly_fee: number;
  created_at: string;
}

// Define preferred class order
const classOrder: { [key: string]: number } = {
  "PG": 1,
  "Nursery": 2,
  "KG": 3,
  // Add other classes here with their desired order number
};


const Classes = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentClass, setCurrentClass] = useState<Class | null>(null);
  // Removed description from formData
  const [formData, setFormData] = useState({ name: "", monthly_fee: "" });
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    // Fetching without specific order initially
    const { data, error } = await supabase
      .from("classes")
      .select("*");
      // .order("name"); // We'll sort manually later

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading classes",
        description: error.message,
      });
    } else {
      setClasses(data || []);
    }
  };

  // Memoized sorted classes
   const sortedClasses = useMemo(() => {
    return [...classes].sort((a, b) => {
      const orderA = classOrder[a.name] || Infinity; // Get order number or use Infinity if not defined
      const orderB = classOrder[b.name] || Infinity;
      if (orderA !== orderB) {
        return orderA - orderB; // Sort by predefined order first
      }
      return a.name.localeCompare(b.name); // Then sort alphabetically for classes not in the custom order
    });
  }, [classes]);


  const resetFormData = () => {
    // Removed description reset
    setFormData({ name: "", monthly_fee: "" });
    setCurrentClass(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("classes").insert({
      name: formData.name,
      // description: formData.description || null, // Removed
      monthly_fee: parseFloat(formData.monthly_fee) || 0,
    });

    if (error) {
      toast({ variant: "destructive", title: "Error creating class", description: error.message });
    } else {
      toast({ title: "Success", description: "Class created successfully" });
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
        // description: formData.description || null, // Removed
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
      })
      .eq("id", currentClass.id);

     if (error) {
      toast({ variant: "destructive", title: "Error updating class", description: error.message });
    } else {
      toast({ title: "Success", description: "Class updated successfully" });
      resetFormData();
      setIsEditDialogOpen(false);
      loadClasses();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Error deleting class", description: error.message });
    } else {
      toast({ title: "Success", description: "Class deleted successfully" });
      loadClasses();
    }
  };

  const openEditDialog = (classItem: Class) => {
    setCurrentClass(classItem);
    setFormData({
      name: classItem.name,
      // description: classItem.description || "", // Removed
      monthly_fee: classItem.monthly_fee?.toString() || "",
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
              <Plus className="h-4 w-4 mr-2" /> Add Class
            </Button>
          </DialogTrigger>
           <DialogContent>
             <DialogHeader><DialogTitle>Create New Class</DialogTitle></DialogHeader>
             <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="add-name">Class Name</Label>
                   <Input id="add-name" placeholder="e.g., PG, Nursery" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                 </div>
                <div className="space-y-2">
                  <Label htmlFor="add-monthly_fee">Monthly Fee (PKR)</Label>
                  <Input id="add-monthly_fee" type="number" step="0.01" placeholder="e.g., 1500" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} required />
                </div>
              </div>
              {/* Description field removed */}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button type="submit">Create Class</Button>
              </DialogFooter>
             </form>
           </DialogContent>
        </Dialog>
      </div>

      {/* Use sortedClasses for mapping */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedClasses.map((classItem) => (
          <Card key={classItem.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {classItem.name}
                <div className="flex items-center space-x-1">
                   {/* Edit Dialog Trigger and Content */}
                   <Dialog open={isEditDialogOpen && currentClass?.id === classItem.id} onOpenChange={(open) => { if (!open) { setIsEditDialogOpen(false); resetFormData(); } else { openEditDialog(classItem); } }}>
                     <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(classItem)}><Edit className="h-4 w-4" /></Button>
                     </DialogTrigger>
                     {currentClass?.id === classItem.id && (
                       <DialogContent>
                         <DialogHeader><DialogTitle>Edit Class: {currentClass.name}</DialogTitle></DialogHeader>
                         <form onSubmit={handleEditSubmit} className="space-y-4">
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor="edit-name">Class Name</Label>
                               <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                             </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-monthly_fee">Monthly Fee (PKR)</Label>
                              <Input id="edit-monthly_fee" type="number" step="0.01" value={formData.monthly_fee} onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })} required />
                            </div>
                          </div>
                           {/* Description field removed */}
                           <DialogFooter>
                             <DialogClose asChild><Button type="button" variant="outline" onClick={resetFormData}>Cancel</Button></DialogClose>
                             <Button type="submit">Save Changes</Button>
                           </DialogFooter>
                         </form>
                       </DialogContent>
                     )}
                   </Dialog>
                   {/* Delete Button */}
                   <Button variant="ghost" size="icon" onClick={() => handleDelete(classItem.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Description removed */}
             <p className="text-sm font-medium mt-1">
               Monthly Fee: {formatCurrencyPKR(classItem.monthly_fee)}
             </p>
            </CardContent>
          </Card>
        ))}
        {classes.length === 0 && <p>No classes found. Add a new class to get started.</p>}
      </div>
    </div>
  );
};

export default Classes;