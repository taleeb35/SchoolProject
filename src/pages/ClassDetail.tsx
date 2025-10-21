import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string | null;
  father_name: string | null;
  phone: string | null;
  total_fee: number;
  joining_date: string;
}

interface Class {
  id: string;
  name: string;
  monthly_fee: number;
}

interface FeeRecord {
  id: string;
  student_id: string;
  is_paid: boolean;
  amount: number;
  payment_date: string | null;
}

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classData, setClassData] = useState<Class | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
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
    if (classId) {
      loadClassData();
      loadStudents();
    }
  }, [classId, selectedMonth]);

  const loadClassData = async () => {
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .eq("id", classId)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load class data",
      });
      navigate("/classes");
    } else {
      setClassData(data);
    }
  };

  const loadStudents = async () => {
    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id, first_name, last_name, father_name, phone, total_fee, joining_date")
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

  const getStudentFeeStatus = (studentId: string) => {
    const record = feeRecords.find((r) => r.student_id === studentId);
    return record?.is_paid || false;
  };

  const getStudentFeeRecord = (studentId: string) => {
    return feeRecords.find((r) => r.student_id === studentId);
  };

  const handleFeeStatusChange = async (studentId: string, newStatus: boolean) => {
    const existingRecord = getStudentFeeRecord(studentId);
    const student = students.find((s) => s.id === studentId);
    
    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from("fee_records")
        .update({
          is_paid: newStatus,
          amount: newStatus ? (student?.total_fee ?? 0) : 0,
          payment_date: newStatus ? new Date().toISOString().split('T')[0] : null,
        })
        .eq("id", existingRecord.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update fee status",
        });
      } else {
        toast({
          title: "Success",
          description: `Fee status updated to ${newStatus ? "Paid" : "Unpaid"}`,
        });
        loadStudents();
      }
    } else {
      // Create new record
      const student = students.find((s) => s.id === studentId);
      if (!student) return;

      const { error } = await supabase
        .from("fee_records")
        .insert({
          student_id: studentId,
          month: selectedMonth,
          year: selectedYear,
          amount: student.total_fee,
          is_paid: newStatus,
          payment_date: newStatus ? new Date().toISOString().split('T')[0] : null,
        });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to create fee record",
        });
      } else {
        toast({
          title: "Success",
          description: `Fee marked as ${newStatus ? "Paid" : "Unpaid"}`,
        });
        loadStudents();
      }
    }
  };

  const paidCount = students.filter((s) => getStudentFeeStatus(s.id)).length;
  const unpaidCount = students.length - paidCount;

  // Filter students based on search query
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name} ${student.last_name || ""}`.toLowerCase();
    const fatherName = (student.father_name || "").toLowerCase();
    const phone = (student.phone || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || fatherName.includes(query) || phone.includes(query);
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset to page 1 when search query or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  if (!classData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate("/classes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{classData.name}</h1>
          <p className="text-muted-foreground">
            Monthly Fee: PKR {classData.monthly_fee.toLocaleString('en-PK')}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="space-y-2 flex-1">
          <Label>Search Students</Label>
          <Input
            placeholder="Search by name, father name, or contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Filter by Month</Label>
          <Select value={selectedMonth.toString()} onValueChange={(val) => setSelectedMonth(parseInt(val))}>
            <SelectTrigger className="w-[200px]">
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
        <div className="space-y-2">
          <Label>Page Size</Label>
          <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(parseInt(val))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Paid Fees ({months[selectedMonth - 1]?.label})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Fees ({months[selectedMonth - 1]?.label})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unpaidCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Father Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Total Fee</TableHead>
                <TableHead>Fee Status ({months[selectedMonth - 1]?.label})</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => {
                  const isPaid = getStudentFeeStatus(student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name || ""}
                      </TableCell>
                      <TableCell>{student.father_name || "-"}</TableCell>
                      <TableCell>{student.phone || "-"}</TableCell>
                      <TableCell>PKR {student.total_fee.toLocaleString('en-PK')}</TableCell>
                      <TableCell>
                        {isPaid ? (
                          <Badge className="bg-success">Paid</Badge>
                        ) : (
                          <Badge variant="secondary">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => handleFeeStatusChange(student.id, true)}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeeStatusChange(student.id, false)}
                            >
                              Mark Unpaid
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    {searchQuery ? "No students found matching your search" : "No students found in this class"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassDetail;
