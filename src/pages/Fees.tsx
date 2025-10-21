import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  total_fee: number;
}

interface Class {
  id: string;
  name: string;
}

interface FeeRecord {
  id: string;
  student_id: string;
  is_paid: boolean;
  amount: number;
  payment_date: string | null;
}

const Fees = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  useEffect(() => {
    loadClasses();
  }, []);

  // Import sorting utility at the top
  const sortClasses = (classes: Class[]) => {
    const classOrder = ['PG', 'Nursery', 'Prep', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
    
    return [...classes].sort((a, b) => {
      const aIndex = classOrder.findIndex(order => 
        a.name.toLowerCase().includes(order.toLowerCase())
      );
      const bIndex = classOrder.findIndex(order => 
        b.name.toLowerCase().includes(order.toLowerCase())
      );
      
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return a.name.localeCompare(b.name);
    });
  };

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    }
  }, [selectedClass, selectedMonth]);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setClasses(sortClasses(data));
    }
  };

  const loadStudents = async (classId: string) => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, total_fee")
      .eq("class_id", classId)
      .order("first_name");

    if (studentsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load students",
      });
      return;
    }

    setStudents(studentsData || []);

    // Load fee records for selected month
    const studentIds = studentsData?.map((s) => s.id) || [];
    if (studentIds.length > 0) {
      const { data: feeData } = await supabase
        .from("fee_records")
        .select("*")
        .in("student_id", studentIds)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      setFeeRecords(feeData || []);
    } else {
      setFeeRecords([]);
    }
  };

  const toggleFeeStatus = async (student: Student) => {
    const existingRecord = feeRecords.find((r) => r.student_id === student.id);

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("fee_records")
        .update({
          is_paid: !existingRecord.is_paid,
          amount: !existingRecord.is_paid ? student.total_fee : 0,
          payment_date: !existingRecord.is_paid
            ? new Date().toISOString()
            : null,
        })
        .eq("id", existingRecord.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Success",
          description: "Fee status updated",
        });
        loadStudents(selectedClass);
      }
    } else {
      // Create new record
      const { error } = await supabase.from("fee_records").insert({
        student_id: student.id,
        month: selectedMonth,
        year: selectedYear,
        is_paid: true,
        amount: student.total_fee,
        payment_date: new Date().toISOString(),
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      } else {
        toast({
          title: "Success",
          description: "Fee marked as paid",
        });
        loadStudents(selectedClass);
      }
    }
  };

  const getStudentFeeStatus = (studentId: string) => {
    const record = feeRecords.find((r) => r.student_id === studentId);
    return record?.is_paid || false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">
          Track and manage student fee payments
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Select Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a class" />
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
          <Label>Select Month</Label>
          <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label} {selectedYear}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedClass && students.length > 0 && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const isPaid = getStudentFeeStatus(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell>{student.first_name} {student.last_name}</TableCell>
                    <TableCell>PKR {student.total_fee.toLocaleString('en-PK')}</TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge className="bg-success">Paid</Badge>
                      ) : (
                        <Badge variant="secondary">Unpaid</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`fee-${student.id}`}
                          checked={isPaid}
                          onCheckedChange={() => toggleFeeStatus(student)}
                        />
                        <label
                          htmlFor={`fee-${student.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Mark as {isPaid ? "Unpaid" : "Paid"}
                        </label>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedClass && students.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          No students found in this class
        </p>
      )}
    </div>
  );
};

export default Fees;
