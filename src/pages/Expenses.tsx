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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface Expense {
  id: string;
  month: number;
  year: number;
  description: string;
  amount: number;
}

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
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

  const calculateProfitLoss = async () => {
    // Calculate total fees collected
    const { data: feeData } = await supabase
      .from("fee_records")
      .select("amount")
      .eq("month", selectedMonth)
      .eq("year", selectedYear)
      .eq("is_paid", true);

    const totalFees = feeData?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;

    // Calculate total employee salaries
    const { data: employeeData } = await supabase
      .from("employees")
      .select("salary");

    const totalSalaries = employeeData?.reduce((sum, emp) => sum + Number(emp.salary), 0) || 0;

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
      setIsDialogOpen(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses & Profit/Loss</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
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
              <Button onClick={handleAddExpense} className="w-full">
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
    </div>
  );
};

export default Expenses;
