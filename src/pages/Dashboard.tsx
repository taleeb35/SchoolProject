import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Briefcase, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

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

  useEffect(() => {
    loadStats();
    loadProfitLossData();
  }, []);

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
    const months = [3, 4, 5, 6, 7, 8, 9, 10, 11]; // Mar to Nov 2025
    
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
      color: "hsl(var(--chart-1))",
    },
    revenue: {
      label: "Revenue",
      color: "hsl(var(--chart-2))",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(var(--chart-3))",
    },
  };

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
            <CardTitle className="flex items-center gap-2">
              Profit & Loss Overview (Mar - Nov 2025)
              {profitLossData[profitLossData.length - 1]?.profit >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={profitLossData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0}/>
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
                    stroke="hsl(var(--chart-2))" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="hsl(var(--chart-3))" 
                    fillOpacity={1} 
                    fill="url(#colorExpenses)"
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--chart-1))" 
                    fillOpacity={1} 
                    fill="url(#colorProfit)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-chart-2">
                  PKR {profitLossData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('en-PK')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold text-chart-3">
                  PKR {profitLossData.reduce((sum, d) => sum + d.expenses, 0).toLocaleString('en-PK')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className={`text-xl font-bold ${profitLossData.reduce((sum, d) => sum + d.profit, 0) >= 0 ? 'text-chart-1' : 'text-red-500'}`}>
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
