import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGoalSheet, useGoalSheets } from "@/hooks/useGoals";
import { useTeamGoalSheets } from "@/hooks/useApprovals";
import { useCompletionDashboard } from "@/hooks/useAdmin";
import { useActiveGoalCycles } from "@/hooks/useGoalCycles";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity, CheckCircle, Target, Users } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.full_name || 'User'}!</h1>
        <p className="text-muted-foreground">
          Here is your overall goal tracking dashboard and analytics.
        </p>
      </div>

      {user?.role === "employee" && <EmployeeDashboardContent />}
      {user?.role === "manager" && <ManagerDashboardContent />}
      {user?.role === "admin" && <AdminDashboardContent />}
    </div>
  );
}

function EmployeeDashboardContent() {
  const { data: sheets, isLoading: sheetsLoading } = useGoalSheets();
  const { data: currentSheetDetail, isLoading: detailLoading } = useGoalSheet(sheets?.[0]?.id);
  
  if (sheetsLoading || (sheets?.[0]?.id && detailLoading)) return <Skeleton className="h-[400px] w-full" />;

  const sheet = currentSheetDetail || sheets?.[0]; // Fallback to overview if detail fails
  const goals = currentSheetDetail?.goals || [];
  
  const thrustAreaCount: Record<string, number> = {};
  goals.forEach(g => {
    thrustAreaCount[g.thrust_area] = (thrustAreaCount[g.thrust_area] || 0) + 1;
  });
  
  const pieData = Object.keys(thrustAreaCount).map(key => ({
    name: key,
    value: thrustAreaCount[key]
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Total Goals" value={goals.length} icon={<Target className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-md" />
        <MetricCard title="Sheet Status" value={sheet?.status ? sheet.status.toUpperCase() : "NO SHEET"} icon={<Activity className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-none shadow-md" />
        <MetricCard title="Total Weightage" value={`${goals.reduce((acc, g) => acc + Number(g.weightage), 0)}%`} icon={<CheckCircle className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-violet-500 to-violet-600 text-white border-none shadow-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Goal Distribution by Thrust Area</CardTitle>
            <CardDescription>Breakdown of your current goals</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No goals set yet.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagerDashboardContent() {
  const { data: teamSheets, isLoading } = useTeamGoalSheets();

  if (isLoading) return <Skeleton className="h-[400px] w-full" />;

  const pendingApprovals = teamSheets?.filter(s => s.status === 'submitted').length || 0;
  const approved = teamSheets?.filter(s => s.status === 'approved').length || 0;
  const rework = teamSheets?.filter(s => s.status === 'rework').length || 0;

  const barData = [
    { name: "Pending Approval", count: pendingApprovals },
    { name: "Approved", count: approved },
    { name: "Rework Required", count: rework },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Pending Approvals" value={pendingApprovals} icon={<Activity className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-md" />
        <MetricCard title="Approved Sheets" value={approved} icon={<CheckCircle className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-md" />
        <MetricCard title="Team Members" value={teamSheets?.length || 0} icon={<Users className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-none shadow-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team Progress Overview</CardTitle>
            <CardDescription>Goal sheet statuses for your direct reports</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const { data: cycles, isLoading: cyclesLoading } = useActiveGoalCycles();
  const { data: completionData, isLoading: completionLoading } = useCompletionDashboard();

  if (cyclesLoading || completionLoading) return <Skeleton className="h-[400px] w-full" />;

  const totalUsers = completionData?.length || 0;
  const completedCheckins = completionData?.filter(u => u.is_complete && u.total_goals > 0).length || 0;
  
  const statusCounts = { "Fully Checked-in": 0, "Pending Check-ins": 0, "No Goals Set": 0 };
  completionData?.forEach(row => {
    if (row.total_goals === 0) {
      statusCounts["No Goals Set"] += 1;
    } else if (row.is_complete) {
      statusCounts["Fully Checked-in"] += 1;
    } else {
      statusCounts["Pending Check-ins"] += 1;
    }
  });

  const pieData = Object.keys(statusCounts).map(key => ({
    name: key,
    value: statusCounts[key as keyof typeof statusCounts]
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Active Cycle" value={cycles?.[0]?.name || "None"} icon={<Activity className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-md" />
        <MetricCard title="Total Employees" value={totalUsers} icon={<Users className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 text-white border-none shadow-md" />
        <MetricCard title="Employees with Check-ins" value={completedCheckins} icon={<CheckCircle className="h-5 w-5 text-white/80" />} className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-none shadow-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quarterly Check-in Completion</CardTitle>
            <CardDescription>Company-wide progress on current check-in cycle</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No data available.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, className }: { title: string; value: string | number; icon: React.ReactNode; className?: string }) {
  return (
    <Card className={`relative overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${className || ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium z-10">{title}</CardTitle>
        <div className="z-10 bg-white/20 p-2 rounded-full">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold z-10 relative drop-shadow-sm">{value}</div>
      </CardContent>
    </Card>
  );
}
