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

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeSalaries, setEmployeeSalaries] = useState<EmployeeSalary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
  });
  const [newSalary, setNewSalary] = useState({
    employee_id: "",
    amount: "",
  });
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
      .select("id, name, salary")
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

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      description: expense.description,
      amount: expense.amount.toString(),
    });
    setIsExpenseDialogOpen(true);
  };

  const closeExpenseDialog = () => {
    setIsExpenseDialogOpen(false);
    setEditingExpense(null);
    setNewExpense({ description: "", amount: "" });
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
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isExpenseDialogOpen} onOpenChange={closeExpenseDialog}>
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
                    className="w-full"
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
            <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employee Salary
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Employee Salary</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Select Employee</Label>
                    <Select
                      value={newSalary.employee_id}
                      onValueChange={(val) =>
                        setNewSalary({ ...newSalary, employee_id: val })
                      }
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
                  <div className="space-y-2">
                    <Label htmlFor="salary-amount">Amount (PKR)</Label>
                    <Input
                      id="salary-amount"
                      type="number"
                      placeholder="Enter salary amount"
                      value={newSalary.amount}
                      onChange={(e) =>
                        setNewSalary({ ...newSalary, amount: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleAddSalary} className="w-full">
                    Add Salary
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
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteSalary(salary.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
      </Tabs>
    </div>
  );
};

export default Expenses;
