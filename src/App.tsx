// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Classes from "./pages/Classes";
import ClassDetail from "./pages/ClassDetail";
import Students from "./pages/Students";
import Fees from "./pages/Fees";
import Employees from "./pages/Employees";
import Expenses from "./pages/Expenses";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Authentication Route */}
            <Route path="/auth" element={<Auth />} />

            {/* Authenticated Routes with Layout */}
            <Route
              path="/"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/classes"
              element={
                <Layout>
                  <Classes />
                </Layout>
              }
            />
            <Route
              path="/classes/:classId"
              element={
                <Layout>
                  <ClassDetail />
                </Layout>
              }
            />
            <Route
              path="/students"
              element={
                <Layout>
                  <Students />
                </Layout>
              }
            />
            <Route
              path="/employees"
              element={
                <Layout>
                  <Employees />
                </Layout>
              }
            />
            <Route
              path="/fees"
              element={
                <Layout>
                  <Fees />
                </Layout>
              }
            />
            <Route
              path="/expenses"
              element={
                <Layout>
                  <Expenses />
                </Layout>
              }
            />
            <Route
              path="/profile"
              element={
                <Layout>
                  <Profile />
                </Layout>
              }
            />

            {/* Catch-all Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;