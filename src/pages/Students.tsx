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
import { Plus, Trash2, Edit, Search, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  father_name: string | null;
  phone: string | null;
  class_id: string;
  total_fee: number;
  joining_date: string;
  created_at: string;
  display_order: number;
  comments: string | null;
  classes: { name: string; monthly_fee: number };
}

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
}

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    father_name: "",
    phone: "",
    class_id: "",
    total_fee: "",
    joining_date: new Date().toISOString().split("T")[0],
    comments: "",
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name, monthly_fee")
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

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select(`
        *,
        classes (
          name,
          monthly_fee
        )
      `)
      .order("display_order")
      .order("first_name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading students",
        description: error.message,
      });
    } else {
      setStudents(data as Student[]);
      setFilteredStudents(data as Student[]);
    }
  };

  // Filter students based on search query and class filter
  useEffect(() => {
    let filtered = students;

    // Apply class filter
    if (selectedClassFilter !== "all") {
      filtered = filtered.filter((student) => student.class_id === selectedClassFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.first_name.toLowerCase().includes(query) ||
          student.last_name?.toLowerCase().includes(query) ||
          student.father_name?.toLowerCase().includes(query) ||
          student.phone?.toLowerCase().includes(query) ||
          student.classes.name.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
    setCurrentPage(1);
  }, [searchQuery, selectedClassFilter, students, itemsPerPage]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  const resetFormData = () => {
    setFormData({
      first_name: "",
      last_name: "",
      father_name: "",
      phone: "",
      class_id: "",
      total_fee: "",
      joining_date: new Date().toISOString().split("T")[0],
      comments: "",
    });
    setCurrentStudent(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("students").insert({
      first_name: formData.first_name,
      last_name: formData.last_name,
      father_name: formData.father_name || null,
      phone: formData.phone || null,
      class_id: formData.class_id,
      total_fee: parseFloat(formData.total_fee) || 0,
      joining_date: formData.joining_date,
      comments: formData.comments || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating student",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Student created successfully",
      });
      resetFormData();
      setIsAddDialogOpen(false);
      loadStudents();
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    const { error } = await supabase
      .from("students")
      .update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        father_name: formData.father_name || null,
        phone: formData.phone || null,
        class_id: formData.class_id,
        total_fee: parseFloat(formData.total_fee) || 0,
        joining_date: formData.joining_date,
        comments: formData.comments || null,
      })
      .eq("id", currentStudent.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating student",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Student updated successfully",
      });
      resetFormData();
      setIsEditDialogOpen(false);
      loadStudents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error deleting student",
        description: error.message,
      });
    } else {
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      loadStudents();
    }
  };

  const openEditDialog = (student: Student) => {
    setCurrentStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      father_name: student.father_name || "",
      phone: student.phone || "",
      class_id: student.class_id,
      total_fee: student.total_fee.toString(),
      joining_date: student.joining_date,
      comments: student.comments || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = currentStudents.findIndex((s) => s.id === active.id);
    const newIndex = currentStudents.findIndex((s) => s.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedStudents = arrayMove(currentStudents, oldIndex, newIndex);
    
    // Update local state immediately
    const updatedFiltered = [...filteredStudents];
    const startIdx = (currentPage - 1) * itemsPerPage;
    reorderedStudents.forEach((student, idx) => {
      updatedFiltered[startIdx + idx] = student;
    });
    setFilteredStudents(updatedFiltered);

    // Update display_order in database
    try {
      const updates = reorderedStudents.map((student, index) => ({
        id: student.id,
        display_order: startIdx + index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("students")
          .update({ display_order: update.display_order })
          .eq("id", update.id);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Student order updated successfully",
      });
      
      await loadStudents();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error updating order",
        description: error.message,
      });
      await loadStudents();
    }
  };

  interface SortableStudentRowProps {
    student: Student;
  }

  const SortableStudentRow = ({ student }: SortableStudentRowProps) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: student.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <TableRow ref={setNodeRef} style={style}>
        <TableCell>
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab active:cursor-grabbing touch-none"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </TableCell>
        <TableCell className="font-medium">{student.first_name}</TableCell>
        <TableCell>{student.last_name}</TableCell>
        <TableCell>{student.father_name || "-"}</TableCell>
        <TableCell>{student.phone || "-"}</TableCell>
        <TableCell>{student.classes.name}</TableCell>
        <TableCell>PKR {student.classes.monthly_fee.toLocaleString('en-PK')}</TableCell>
        <TableCell>PKR {student.total_fee.toLocaleString('en-PK')}</TableCell>
        <TableCell className="max-w-xs truncate">{student.comments || "-"}</TableCell>
        <TableCell className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEditDialog(student)}
          >
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetFormData}>
              <Plus className="h-4 w-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-first_name">First Name</Label>
                  <Input
                    id="add-first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-last_name">Last Name (Optional)</Label>
                  <Input
                    id="add-last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-father_name">Father Name (Optional)</Label>
                  <Input
                    id="add-father_name"
                    value={formData.father_name}
                    onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">Contact Number</Label>
                  <Input
                    id="add-phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-class">Class</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                    required
                  >
                    <SelectTrigger>
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
                  <Label htmlFor="add-total_fee">Total Fee</Label>
                  <Input
                    id="add-total_fee"
                    type="number"
                    step="0.01"
                    value={formData.total_fee}
                    onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })}
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
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="add-comments">Comments (Optional)</Label>
                <Input
                  id="add-comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Add any notes about this student..."
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Add Student</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-48">
          <Select value={selectedClassFilter} onValueChange={setSelectedClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Showing {currentStudents.length} of {filteredStudents.length} students
        </p>
      </div>

      <div className="border rounded-lg">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>First Name</TableHead>
                <TableHead>Last Name</TableHead>
                <TableHead>Father Name</TableHead>
                <TableHead>Contact Number</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Class Fee</TableHead>
                <TableHead>Total Fee</TableHead>
                <TableHead>Comments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentStudents.length > 0 ? (
                <SortableContext
                  items={currentStudents.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {currentStudents.map((student) => (
                    <SortableStudentRow key={student.id} student={student} />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    {searchQuery ? "No students match your search." : "No students found. Add a new student to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
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
            <DialogTitle>Edit Student: {currentStudent?.first_name} {currentStudent?.last_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first_name">First Name</Label>
                <Input
                  id="edit-first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last_name">Last Name (Optional)</Label>
                <Input
                  id="edit-last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-father_name">Father Name (Optional)</Label>
                <Input
                  id="edit-father_name"
                  value={formData.father_name}
                  onChange={(e) => setFormData({ ...formData, father_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Contact Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-class">Class</Label>
                <Select
                  value={formData.class_id}
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  required
                >
                  <SelectTrigger>
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
                <Label htmlFor="edit-total_fee">Total Fee</Label>
                <Input
                  id="edit-total_fee"
                  type="number"
                  step="0.01"
                  value={formData.total_fee}
                  onChange={(e) => setFormData({ ...formData, total_fee: e.target.value })}
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
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-comments">Comments (Optional)</Label>
                <Input
                  id="edit-comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="Add any notes about this student..."
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
      </Dialog>
    </div>
  );
};

export default Students;
