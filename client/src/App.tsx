import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

import AuthPage from "@/pages/auth-page";
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherTraining from "@/pages/teacher/training";
import TeacherAdmin from "@/pages/teacher/admin";
import TeacherReports from "@/pages/teacher/reports";
import TeacherLessonPlans from "@/pages/teacher/lesson-plans";
import TeacherCourses from "@/pages/teacher/courses";
import StudentDashboard from "@/pages/student/dashboard";
import StudentChat from "@/pages/student/chat";
import NotFound from "@/pages/not-found";

import TeacherLayout from "@/components/layout/teacher-layout";
import StudentLayout from "@/components/layout/student-layout";

function Router() {
  const { user, isLoading } = useUser();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no user is logged in, show the auth page
  if (!user) {
    return <AuthPage />;
  }

  // Teacher routes
  if (user.role === "teacher") {
    return (
      <TeacherLayout>
        <Switch>
          <Route path="/" component={TeacherDashboard} />
          <Route path="/courses" component={TeacherCourses} />
          <Route path="/training" component={TeacherTraining} />
          <Route path="/admin" component={TeacherAdmin} />
          <Route path="/reports" component={TeacherReports} />
          <Route path="/lesson-plans" component={TeacherLessonPlans} />
          <Route component={NotFound} />
        </Switch>
      </TeacherLayout>
    );
  }

  // Student routes
  return (
    <StudentLayout>
      <Switch>
        <Route path="/" component={StudentDashboard} />
        <Route path="/chat/:courseId" component={StudentChat} />
        <Route component={NotFound} />
      </Switch>
    </StudentLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;