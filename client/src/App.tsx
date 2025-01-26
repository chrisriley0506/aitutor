import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import TeacherDashboard from "@/pages/teacher/dashboard";
import LessonPlans from "@/pages/teacher/lesson-plans";
import Courses from "@/pages/teacher/courses";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/teacher/dashboard" component={TeacherDashboard} />
      <Route path="/teacher/lesson-plans" component={LessonPlans} />
      <Route path="/teacher/courses" component={Courses} />
      <Route component={NotFound} />
    </Switch>
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
