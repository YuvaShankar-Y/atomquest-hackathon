import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AIDemo } from "@/pages/AIDemo";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Profile } from "@/pages/Profile";
import { Register } from "@/pages/Register";
import { EmployeeGoalSheet } from "@/pages/EmployeeGoalSheet";
import { ManagerApprovals } from "@/pages/ManagerApprovals";
import { EmployeeCheckins } from "@/pages/EmployeeCheckins";
import { ManagerCheckins } from "@/pages/ManagerCheckins";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employee/goals" element={<EmployeeGoalSheet />} />
              <Route path="/employee/checkins" element={<EmployeeCheckins />} />
              <Route path="/manager/approvals" element={<ManagerApprovals />} />
              <Route path="/manager/checkins" element={<ManagerCheckins />} />
              <Route path="/ai" element={<AIDemo />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
