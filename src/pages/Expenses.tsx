import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Expense {
  id: string;
  month: number;
  year: number;
  description: string;
  amount: number;
}

interface Employee {
  id: string;
  name: string;
  salary: number;
  joining_date: string;
  designation: string | null;
}

interface EmployeeSalary {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  amount: number;
  employee?: {
    name: string;
  };
}

interface EmployeeAttendance {
  id: string;
  employee_id: string;
  month: number;
  year: number;
  leaves_taken: number;
  attendance_data: Record<string, string>; // {day: status} where status is P/A/H/R
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSalaries, setEmployeeSalaries] = useState<EmployeeSalary[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingSalary, setEditingSalary] = useState<EmployeeSalary | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
  });
  const [newSalary, setNewSalary] = useState({
    employee_id: "",
    amount: "",
  });
  const [newAttendance, setNewAttendance] = useState({
    employee_id: "",
    leaves_taken: "",
  });
  const [attendanceData, setAttendanceData] = useState<Record<string, Record<string, string>>>({});
  const [profitLoss, setProfitLoss] = useState({
    totalFees: 0,
    totalSalaries: 0,
    totalExpenses: 0,
    profit: 0,
  });
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
    loadExpenses();
    loadEmployees();
    loadEmployeeSalaries();
    loadAttendance();
    calculateProfitLoss();
  }, [selectedMonth, selectedYear]);

  const loadExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load expenses",
      });
    } else {
      setExpenses(data || []);
    }
  };

  const loadEmployees = async () => {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, salary, joining_date, designation")
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employees",
      });
    } else {
      setEmployees(data || []);
    }
  };

  const loadEmployeeSalaries = async () => {
    const { data, error } = await supabase
      .from("employee_salaries")
      .select(`
        id,
        employee_id,
        month,
        year,
        amount,
        employees (name)
      `)
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load employee salaries",
      });
    } else {
      const formattedData = data?.map(item => ({
        ...item,
        employee: Array.isArray(item.employees) ? item.employees[0] : item.employees
      })) || [];
      setEmployeeSalaries(formattedData);
    }
  };

  const loadAttendance = async () => {
    const { data, error } = await supabase
      .from("employee_attendance")
      .select("*")
      .eq("month", selectedMonth)
      .eq("year", selectedYear);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load attendance",
      });
    } else {
      // Cast Json type to Record<string, string> for attendance_data
      const typedData = (data || []).map(item => ({
        ...item,
        attendance_data: (item.attendance_data as Record<string, string>) || {}
      }));
      setAttendance(typedData);
    }
  };

  const calculateProfitLoss = async () => {
    // Calculate total fees collected strictly from each student's Total Fee
    const { data: paidFeeRecords } = await supabase
      .from("fee_records")
      .select("student_id")
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .eq("is_paid", true);

    const studentIds = Array.from(new Set((paidFeeRecords || []).map((r: { student_id: string }) => r.student_id)));
    let totalFees = 0;
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, total_fee")
        .in("id", studentIds);
      totalFees = studentsData?.reduce((sum: number, s: { total_fee: number }) => sum + Number(s.total_fee), 0) || 0;
    }

    // Calculate total employee salaries for this month
    const { data: salaryData } = await supabase
      .from("employee_salaries")
      .select("amount")
      .eq("month", selectedMonth)
      .eq("year", selectedYear);

    const totalSalaries = salaryData?.reduce((sum, sal) => sum + Number(sal.amount), 0) || 0;

    // Calculate total other expenses
    const { data: expenseData } = await supabase
      .from("expenses")
      .select("amount")
      .eq("month", selectedMonth)
      .eq("year", selectedYear);

    const totalExpenses = expenseData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

    const profit = totalFees - totalSalaries - totalExpenses;

    setProfitLoss({
      totalFees,
      totalSalaries,
      totalExpenses,
      profit,
    });
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    const { error } = await supabase.from("expenses").insert({
      month: selectedMonth,
      year: selectedYear,
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add expense",
      });
    } else {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      setNewExpense({ description: "", amount: "" });
      setIsExpenseDialogOpen(false);
      loadExpenses();
      calculateProfitLoss();
    }
  };

  const handleEditExpense = async () => {
    if (!editingExpense || !newExpense.description || !newExpense.amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
      })
      .eq("id", editingExpense.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update expense",
      });
    } else {
      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
      setNewExpense({ description: "", amount: "" });
      setEditingExpense(null);
      setIsExpenseDialogOpen(false);
      loadExpenses();
      calculateProfitLoss();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete expense",
      });
    } else {
      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
      loadExpenses();
      calculateProfitLoss();
    }
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate();
  };

  const calculateActualSalary = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return { defaultSalary: 0, actualSalary: 0, leaves: 0, daysInMonth: 0 };

    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const employeeAttendance = attendance.find(a => a.employee_id === employeeId);
    
    // Count absences from attendance_data
    let leaves = 0;
    if (employeeAttendance?.attendance_data) {
      leaves = Object.values(employeeAttendance.attendance_data).filter(status => status === 'A').length;
    }
    
    const dailySalary = employee.salary / daysInMonth;
    const actualSalary = employee.salary - (dailySalary * leaves);

    return {
      defaultSalary: employee.salary,
      actualSalary: Math.round(actualSalary),
      leaves,
      daysInMonth
    };
  };

  const handleAddSalary = async () => {
    if (!newSalary.employee_id || !newSalary.amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an employee and enter amount",
      });
      return;
    }

    // Check if salary already exists for this employee in this month
    const { data: existing } = await supabase
      .from("employee_salaries")
      .select("id")
      .eq("employee_id", newSalary.employee_id)
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .maybeSingle();

    if (existing) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Salary already recorded for this employee in this month",
      });
      return;
    }

    const { error } = await supabase.from("employee_salaries").insert({
      employee_id: newSalary.employee_id,
      month: selectedMonth,
      year: selectedYear,
      amount: parseFloat(newSalary.amount),
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add salary",
      });
    } else {
      toast({
        title: "Success",
        description: "Salary added successfully",
      });
      setNewSalary({ employee_id: "", amount: "" });
      setIsSalaryDialogOpen(false);
      loadEmployeeSalaries();
      calculateProfitLoss();
    }
  };

  const handleEditSalary = async () => {
    if (!editingSalary || !newSalary.employee_id || !newSalary.amount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      });
      return;
    }

    const { error } = await supabase
      .from("employee_salaries")
      .update({
        amount: parseFloat(newSalary.amount),
      })
      .eq("id", editingSalary.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update salary",
      });
    } else {
      toast({
        title: "Success",
        description: "Salary updated successfully",
      });
      setNewSalary({ employee_id: "", amount: "" });
      setEditingSalary(null);
      setIsSalaryDialogOpen(false);
      loadEmployeeSalaries();
      calculateProfitLoss();
    }
  };

  const handleDeleteSalary = async (id: string) => {
    const { error } = await supabase
      .from("employee_salaries")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete salary",
      });
    } else {
      toast({
        title: "Success",
        description: "Salary deleted successfully",
      });
      loadEmployeeSalaries();
      calculateProfitLoss();
    }
  };

  const handleSaveAttendance = async (employeeId: string) => {
    const empAttendanceData = attendanceData[employeeId] || {};
    
    // Count absences for leaves_taken field
    const leaves = Object.values(empAttendanceData).filter(status => status === 'A').length;

    // Check if attendance already exists
    const { data: existing } = await supabase
      .from("employee_attendance")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from("employee_attendance")
        .update({ 
          leaves_taken: leaves,
          attendance_data: empAttendanceData 
        })
        .eq("id", existing.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update attendance",
        });
        return;
      }
    } else {
      // Insert new record
      const { error } = await supabase.from("employee_attendance").insert({
        employee_id: employeeId,
        month: selectedMonth,
        year: selectedYear,
        leaves_taken: leaves,
        attendance_data: empAttendanceData,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add attendance",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "Attendance saved successfully",
    });
    loadAttendance();
  };

  const handleAttendanceChange = (employeeId: string, day: number, status: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [day]: status
      }
    }));
  };

  useEffect(() => {
    // Load attendance data into state
    const data: Record<string, Record<string, string>> = {};
    attendance.forEach(att => {
      if (att.attendance_data) {
        data[att.employee_id] = att.attendance_data;
      }
    });
    setAttendanceData(data);
  }, [attendance]);

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount.toString(),
    });
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseDialogChange = (open: boolean) => {
    setIsExpenseDialogOpen(open);
    if (!open) {
      setEditingExpense(null);
      setNewExpense({ description: "", amount: "" });
    }
  };

  const openEditSalaryDialog = (salary: EmployeeSalary) => {
    setEditingSalary(salary);
    setNewSalary({
      employee_id: salary.employee_id,
      amount: salary.amount.toString(),
    });
    setIsSalaryDialogOpen(true);
  };

  const handleSalaryDialogChange = (open: boolean) => {
    setIsSalaryDialogOpen(open);
    if (!open) {
      setEditingSalary(null);
      setNewSalary({ employee_id: "", amount: "" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses & Profit/Loss</h1>
      </div>

      <div className="space-y-2">
        <Label>Select Month</Label>
        <div className="flex gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(val) => setSelectedMonth(parseInt(val))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Choose a month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Fees Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              PKR {profitLoss.totalFees.toLocaleString('en-PK')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Employee Salaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              PKR {profitLoss.totalSalaries.toLocaleString('en-PK')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Other Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              PKR {profitLoss.totalExpenses.toLocaleString('en-PK')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Net Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitLoss.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              PKR {profitLoss.profit.toLocaleString('en-PK')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {profitLoss.profit >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="salaries">Employee Salaries</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isExpenseDialogOpen} onOpenChange={handleExpenseDialogChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Enter expense description"
                      value={newExpense.description}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (PKR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={newExpense.amount}
                      onChange={(e) =>
                        setNewExpense({ ...newExpense, amount: e.target.value })
                      }
                    />
                  </div>
                  <Button 
                    onClick={editingExpense ? handleEditExpense : handleAddExpense} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {editingExpense ? 'Update Expense' : 'Add Expense'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length > 0 ? (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>PKR {Number(expense.amount).toLocaleString('en-PK')}</TableCell>
                      <TableCell>{months[expense.month - 1]?.label}</TableCell>
                      <TableCell>{expense.year}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No expenses found for {months[selectedMonth - 1]?.label} {selectedYear}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="salaries" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isSalaryDialogOpen} onOpenChange={handleSalaryDialogChange}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee Salary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingSalary ? 'Edit Employee Salary' : 'Add Employee Salary'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Select Employee</Label>
                    <Select
                      value={newSalary.employee_id}
                      onValueChange={(val) => {
                        setNewSalary({ ...newSalary, employee_id: val });
                        if (!editingSalary) {
                          const salaryCalc = calculateActualSalary(val);
                          setNewSalary({ employee_id: val, amount: salaryCalc.actualSalary.toString() });
                        }
                      }}
                      disabled={!!editingSalary}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} (Default: PKR {emp.salary.toLocaleString('en-PK')})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newSalary.employee_id && (
                    <div className="p-3 bg-muted rounded-md space-y-2 text-sm">
                      {(() => {
                        const calc = calculateActualSalary(newSalary.employee_id);
                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Default Salary:</span>
                              <span className="font-medium">PKR {calc.defaultSalary.toLocaleString('en-PK')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Days in Month:</span>
                              <span className="font-medium">{calc.daysInMonth}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Leaves Taken:</span>
                              <span className="font-medium">{calc.leaves} days</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-semibold">
                              <span>Actual Salary:</span>
                              <span className="text-primary">PKR {calc.actualSalary.toLocaleString('en-PK')}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="salary-amount">Final Amount (PKR)</Label>
                    <Input
                      id="salary-amount"
                      type="number"
                      placeholder="Enter salary amount"
                      value={newSalary.amount}
                      onChange={(e) =>
                        setNewSalary({ ...newSalary, amount: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">You can adjust the final amount if needed</p>
                  </div>
                  <Button 
                    onClick={editingSalary ? handleEditSalary : handleAddSalary} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {editingSalary ? 'Update Salary' : 'Add Salary'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSalaries.length > 0 ? (
                  employeeSalaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{salary.employee?.name || 'Unknown'}</TableCell>
                      <TableCell>PKR {Number(salary.amount).toLocaleString('en-PK')}</TableCell>
                      <TableCell>{months[salary.month - 1]?.label}</TableCell>
                      <TableCell>{salary.year}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSalaryDialog(salary)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteSalary(salary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No salaries recorded for {months[selectedMonth - 1]?.label} {selectedYear}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            Mark daily attendance for {months[selectedMonth - 1]?.label} {selectedYear}. 
            P = Present, A = Absent, H = Holiday, R = Rest/Off. Only Absent (A) days will be deducted from salary.
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[150px]">Name</TableHead>
                  <TableHead className="min-w-[100px]">Salary</TableHead>
                  {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => (
                    <TableHead key={i + 1} className="text-center min-w-[60px]">{i + 1}</TableHead>
                  ))}
                  <TableHead className="min-w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((emp) => {
                    const empAttendance = attendanceData[emp.id] || {};
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium">{emp.name}</TableCell>
                        <TableCell>{emp.salary.toLocaleString('en-PK')}</TableCell>
                        {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => {
                          const day = i + 1;
                          const status = empAttendance[day] || 'P';
                          return (
                            <TableCell key={day} className="p-1">
                              <Select
                                value={status}
                                onValueChange={(val) => handleAttendanceChange(emp.id, day, val)}
                              >
                                <SelectTrigger className={`h-8 text-xs ${
                                  status === 'P' ? 'bg-green-100 dark:bg-green-900' :
                                  status === 'A' ? 'bg-red-100 dark:bg-red-900' :
                                  status === 'H' ? 'bg-blue-100 dark:bg-blue-900' :
                                  'bg-yellow-100 dark:bg-yellow-900'
                                }`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="P">P</SelectItem>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="H">H</SelectItem>
                                  <SelectItem value="R">R</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          );
                        })}
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSaveAttendance(emp.id)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            Save
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={getDaysInMonth(selectedMonth, selectedYear) + 3} className="text-center">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
            <h3 className="font-semibold mb-3">Salary Summary</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Default Salary</TableHead>
                    <TableHead>Absences</TableHead>
                    <TableHead>Days in Month</TableHead>
                    <TableHead>Actual Salary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const calc = calculateActualSalary(emp.id);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell>PKR {calc.defaultSalary.toLocaleString('en-PK')}</TableCell>
                        <TableCell>{calc.leaves} days</TableCell>
                        <TableCell>{calc.daysInMonth} days</TableCell>
                        <TableCell className="font-semibold">
                          PKR {calc.actualSalary.toLocaleString('en-PK')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Expenses;
