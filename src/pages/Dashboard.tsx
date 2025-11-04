import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Briefcase, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalEmployees: 0,
  });
  const [profitLossData, setProfitLossData] = useState<Array<{
    month: string;
    profit: number;
    revenue: number;
    expenses: number;
  }>>([]);
  const [startMonth, setStartMonth] = useState(3); // March
  const [endMonth, setEndMonth] = useState(11); // November

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadProfitLossData();
  }, [startMonth, endMonth]);

  const loadStats = async () => {
    const [classesRes, studentsRes, employeesRes] = await Promise.all([
      supabase.from("classes").select("id", { count: "exact" }),
      supabase.from("students").select("id", { count: "exact" }),
      supabase.from("employees").select("id", { count: "exact" }),
    ]);

    setStats({
      totalClasses: classesRes.count || 0,
      totalStudents: studentsRes.count || 0,
      totalEmployees: employeesRes.count || 0,
    });
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const loadProfitLossData = async () => {
    const currentYear = 2025;
    // Generate array of months from startMonth to endMonth
    const months = [];
    for (let i = startMonth; i <= endMonth; i++) {
      months.push(i);
    }
    
    const monthlyData = await Promise.all(
      months.map(async (month) => {
        // Get fees collected
        const { data: feeRecords } = await supabase
          .from("fee_records")
          .select("amount")
          .eq("month", month)
          .eq("year", currentYear)
          .eq("is_paid", true);
        
        const totalFees = feeRecords?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;

        // Get salaries
        const { data: salaryData } = await supabase
          .from("employee_salaries")
          .select("amount")
          .eq("month", month)
          .eq("year", currentYear);
        
        const totalSalaries = salaryData?.reduce((sum, sal) => sum + Number(sal.amount), 0) || 0;

        // Get expenses
        const { data: expenseData } = await supabase
          .from("expenses")
          .select("amount")
          .eq("month", month)
          .eq("year", currentYear);
        
        const totalExpenses = expenseData?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;

        const profit = totalFees - totalSalaries - totalExpenses;
        const totalCosts = totalSalaries + totalExpenses;

        return {
          month: monthNames[month - 1],
          profit: profit,
          revenue: totalFees,
          expenses: totalCosts,
        };
      })
    );

    setProfitLossData(monthlyData);
  };

  const chartConfig = {
    profit: {
      label: "Profit",
      color: "hsl(142, 76%, 36%)",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(217, 91%, 60%)",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(0, 84%, 60%)",
    },
  };

  const months = [
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to School Management System</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/classes">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClasses}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/students">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/employees">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {profitLossData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Profit & Loss Overview (2025)
                {profitLossData[profitLossData.length - 1]?.profit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-4">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Label className="text-sm">From:</Label>
                  <Select value={startMonth.toString()} onValueChange={(v) => setStartMonth(Number(v))}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()} disabled={m.value > endMonth}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">To:</Label>
                  <Select value={endMonth.toString()} onValueChange={(v) => setEndMonth(Number(v))}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value.toString()} disabled={m.value < startMonth}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitLossData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value: number) => `PKR ${value.toLocaleString('en-PK')}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(217, 91%, 60%)" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(0, 84%, 60%)" 
                    fillOpacity={1} 
                    fill="url(#colorExpenses)"
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(142, 76%, 36%)" 
                    fillOpacity={1} 
                    fill="url(#colorProfit)"
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold" style={{ color: 'hsl(217, 91%, 60%)' }}>
                  PKR {profitLossData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('en-PK')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold" style={{ color: 'hsl(0, 84%, 60%)' }}>
                  PKR {profitLossData.reduce((sum, d) => sum + d.expenses, 0).toLocaleString('en-PK')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-xl font-bold`} style={{ color: profitLossData.reduce((sum, d) => sum + d.profit, 0) >= 0 ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)' }}>
                  PKR {profitLossData.reduce((sum, d) => sum + d.profit, 0).toLocaleString('en-PK')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
