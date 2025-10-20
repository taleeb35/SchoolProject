// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, Briefcase } from "lucide-react"; // Import Briefcase
import { Link } from "react-router-dom"; // Import Link for navigation
import { formatCurrencyPKR } from "@/lib/utils"; // Import formatter if needed (though not used here now)


const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalEmployees: 0, // Added employee count
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [classesRes, studentsRes, employeesRes] = await Promise.all([
        supabase.from("classes").select("id", { count: "exact", head: true }), // Use head: true for count only
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }), // Fetch employee count
      ]);

      setStats({
        totalClasses: classesRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalEmployees: employeesRes.count || 0, // Set employee count
      });
    } catch (error) {
       console.error("Error loading dashboard stats:", error);
       // Optional: Show toast notification for error
    } finally {
        setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, linkTo }: { title: string; value: number; icon: React.ElementType; linkTo: string }) => (
     <Link to={linkTo} className="block hover:shadow-lg transition-shadow duration-200">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="h-8 w-1/2 animate-pulse rounded-md bg-muted"></div> // Simple skeleton loader
          ) : (
             <div className="text-2xl font-bold">{value}</div>
          )}

        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to School Management System</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"> {/* Adjusted grid cols */}
        <StatCard title="Total Classes" value={stats.totalClasses} icon={GraduationCap} linkTo="/classes" />
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} linkTo="/students" />
        <StatCard title="Total Employees" value={stats.totalEmployees} icon={Briefcase} linkTo="/employees" />
        {/* Removed Fee Cards */}
      </div>

       {/* Optional: Add other dashboard elements here */}
    </div>
  );
};

export default Dashboard;