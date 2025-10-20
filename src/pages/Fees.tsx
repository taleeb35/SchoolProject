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
  const [currentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear] = useState(new Date().getFullYear());
  const { toast } = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadStudents(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      .order("name");

    if (!error && data) {
      setClasses(data);
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

    // Load fee records for current month
    const studentIds = studentsData?.map((s) => s.id) || [];
    if (studentIds.length > 0) {
      const { data: feeData } = await supabase
        .from("fee_records")
        .select("*")
        .in("student_id", studentIds)
        .eq("month", currentMonth)
        .eq("year", currentYear);

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
        month: currentMonth,
        year: currentYear,
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
          Track and manage student fee payments for {new Date().toLocaleString("default", { month: "long" })} {currentYear}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Select Class</Label>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-64">
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
                    <TableCell>${student.total_fee}</TableCell>
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
