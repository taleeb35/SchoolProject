// src/pages/Fees.tsx
import { useEffect, useState, useMemo } from "react"; // Added useMemo
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
import { formatCurrencyPKR } from "@/lib/utils"; // Import currency formatter

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  total_fee: number; // This might be the student-specific override
  classes: { monthly_fee: number }; // Get class fee too
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

// Define preferred class order (copy from Classes.tsx or centralize)
const classOrder: { [key: string]: number } = {
  "PG": 1,
  "Nursery": 2,
  "KG": 3,
};


// Helper to get months and years for dropdowns
const getMonths = () => {
    return Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(0, i).toLocaleString('default', { month: 'long' }),
    }));
};

const getYears = (range = 5) => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: range * 2 + 1 }, (_, i) => currentYear - range + i);
};


const Fees = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const months = useMemo(() => getMonths(), []);
  const years = useMemo(() => getYears(), []);


  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedMonth && selectedYear) {
      loadStudentsAndFees(selectedClass, selectedMonth, selectedYear);
    } else {
      setStudents([]); // Clear students if class/month/year is not selected
      setFeeRecords([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedMonth, selectedYear]); // Reload when class, month or year changes

  const loadClasses = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("id, name")
      // .order("name"); // Sort manually later

    if (!error && data) {
       // Sort classes based on predefined order then alphabetically
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

  const loadStudentsAndFees = async (classId: string, month: number, year: number) => {
    setLoading(true);
    setStudents([]); // Clear previous students
    setFeeRecords([]); // Clear previous records

    // Fetch students of the selected class, including their specific fee and the class's default fee
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, total_fee, classes ( monthly_fee )") // Select class fee too
      .eq("class_id", classId)
      .order("first_name").order("last_name");

    if (studentsError) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load students" });
      setLoading(false);
      return;
    }

    const currentStudents = studentsData || [];
    setStudents(currentStudents as Student[]);

    // Load fee records for the selected month and year for these students
    const studentIds = currentStudents.map((s) => s.id);
    if (studentIds.length > 0) {
      const { data: feeData, error: feeError } = await supabase
        .from("fee_records")
        .select("*")
        .in("student_id", studentIds)
        .eq("month", month)
        .eq("year", year);

       if(feeError) {
          toast({ variant: "destructive", title: "Error", description: "Failed to load fee records" });
       } else {
          setFeeRecords(feeData || []);
       }
    }
    setLoading(false);
  };

   const determineFeeAmount = (student: Student): number => {
     // Prioritize student-specific fee if it's set and greater than 0
     if (student.total_fee && student.total_fee > 0) {
       return student.total_fee;
     }
     // Otherwise, use the class's monthly fee
     return student.classes?.monthly_fee || 0;
   };


  const toggleFeeStatus = async (student: Student) => {
    const existingRecord = feeRecords.find(
        (r) => r.student_id === student.id && r.month === selectedMonth && r.year === selectedYear
    );
    const feeAmount = determineFeeAmount(student); // Determine correct fee

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("fee_records")
        .update({
          is_paid: !existingRecord.is_paid,
          payment_date: !existingRecord.is_paid ? new Date().toISOString() : null,
          amount: feeAmount, // Update amount in case student/class fee changed
        })
        .eq("id", existingRecord.id);

      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else {
        toast({ title: "Success", description: "Fee status updated" });
        // Optimistic UI update or reload
         setFeeRecords(prev => prev.map(r => r.id === existingRecord.id ? {...r, is_paid: !existingRecord.is_paid, payment_date: !existingRecord.is_paid ? new Date().toISOString() : null, amount: feeAmount } : r));
        // loadStudentsAndFees(selectedClass, selectedMonth, selectedYear); // Or reload
      }
    } else {
      // Create new record for the selected month/year
      const { data: newRecord, error } = await supabase
        .from("fee_records")
        .insert({
          student_id: student.id,
          month: selectedMonth,
          year: selectedYear,
          is_paid: true, // Mark as paid when creating initially via toggle
          amount: feeAmount, // Use the determined fee amount
          payment_date: new Date().toISOString(),
        })
        .select() // Select the newly created record
        .single();


      if (error) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      } else if (newRecord) {
        toast({ title: "Success", description: "Fee marked as paid" });
         setFeeRecords(prev => [...prev, newRecord]); // Add new record to state
        // loadStudentsAndFees(selectedClass, selectedMonth, selectedYear); // Or reload
      }
    }
  };

  const getStudentFeeStatus = (studentId: string): FeeRecord | undefined => {
    return feeRecords.find(
        (r) => r.student_id === studentId && r.month === selectedMonth && r.year === selectedYear
        );
  };

  // Calculate totals
  const totals = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let totalExpected = 0;

    students.forEach(student => {
      const record = getStudentFeeStatus(student.id);
      const feeAmount = determineFeeAmount(student);
      totalExpected += feeAmount;
      if (record?.is_paid) {
        paid += record.amount; // Use the amount from the record
      } else {
          unpaid += feeAmount; // Assume unpaid amount is the expected fee
      }
    });

    return { paid, unpaid, totalExpected };
  }, [students, feeRecords, selectedMonth, selectedYear]); // Recalculate when data changes


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fee Management</h1>
        <p className="text-muted-foreground">
          Track and manage student fee payments.
        </p>
      </div>

       <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
                <Label htmlFor="class-select">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger id="class-select" className="w-48">
                    <SelectValue placeholder="Choose class" />
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
             <div className="space-y-1.5">
                <Label htmlFor="month-select">Select Month</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger id="month-select" className="w-36">
                    <SelectValue placeholder="Choose month" />
                </SelectTrigger>
                <SelectContent>
                    {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="year-select">Select Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger id="year-select" className="w-28">
                    <SelectValue placeholder="Choose year" />
                </SelectTrigger>
                <SelectContent>
                    {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                        {year}
                    </SelectItem>
                    ))}
                </SelectContent>
                </Select>
            </div>
       </div>


      {selectedClass && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Expected</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatCurrencyPKR(totals.totalExpected)}</div></CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Collected</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-success">{formatCurrencyPKR(totals.paid)}</div></CardContent>
            </Card>
             <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Pending</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-destructive">{formatCurrencyPKR(totals.unpaid)}</div></CardContent>
            </Card>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          {loading ? (
             <div className="p-8 text-center">Loading student fees...</div>
          ) : students.length > 0 ? (
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Fee Amount (PKR)</TableHead>
                    <TableHead>Status</TableHead>
                     <TableHead>Payment Date</TableHead>
                    <TableHead>Action</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {students.map((student) => {
                    const feeRecord = getStudentFeeStatus(student.id);
                    const isPaid = feeRecord?.is_paid || false;
                    const feeAmount = determineFeeAmount(student); // Use helper
                    const paymentDate = feeRecord?.payment_date ? new Date(feeRecord.payment_date).toLocaleDateString() : "-";

                    return (
                    <TableRow key={student.id}>
                        <TableCell>{student.first_name} {student.last_name || ''}</TableCell>
                        <TableCell>{formatCurrencyPKR(feeAmount)}</TableCell>
                        <TableCell>
                        {isPaid ? (
                            <Badge className="bg-success text-success-foreground hover:bg-success/90">Paid</Badge>
                        ) : (
                            <Badge variant="destructive">Unpaid</Badge>
                        )}
                        </TableCell>
                         <TableCell>{paymentDate}</TableCell>
                        <TableCell>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                            id={`fee-${student.id}`}
                            checked={isPaid}
                            onCheckedChange={() => toggleFeeStatus(student)}
                            aria-label={`Mark fee for ${student.first_name} as ${isPaid ? 'Unpaid' : 'Paid'}`}
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
            ) : (
             <p className="text-center text-muted-foreground p-8">
                 No students found in this class for the selected period, or select a class.
             </p>
            )}
        </div>
        </>
      )}


    </div>
  );
};

export default Fees;