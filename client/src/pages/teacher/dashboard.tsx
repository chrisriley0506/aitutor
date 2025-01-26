import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
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
import { Users, MessageSquare, BookOpen, Brain, Plus, Upload } from "lucide-react";
import CreateCourseForm from "@/components/teacher/create-course-form";
import { CurriculumWizard } from "@/components/teacher/curriculum-wizard";
import { format, startOfDay } from "date-fns";
import type { Course } from "@db/schema";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Stats = {
  totalStudents: number;
  totalCourses: number;
  totalChats: number;
  totalMaterials: number;
  activityData: {
    date: string;
    chats: number;
    materials: number;
  }[];
};

type LessonPlan = {
  id: number;
  topic: string;
  weekStart: string;
  courseId: number;
  courseName?: string;
  standard?: {
    identifier: string;
    description: string;
    subject: string;
    gradeLevel: string;
  };
  standardIdentifier?: string;
};

export default function TeacherDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [planDate, setPlanDate] = useState<Date | undefined>(selectedDate);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSimpleAdd, setIsSimpleAdd] = useState(true);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);

  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['/api/stats'],
  });

  const { data: lessonPlans } = useQuery<LessonPlan[]>({
    queryKey: ['/api/lesson-plans'],
  });

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const addPlanMutation = useMutation({
    mutationFn: async (data: {
      topic: string;
      weekStart: string;
      courseId: number;
      standardIdentifier?: string;
    }) => {
      const response = await fetch("/api/weekly-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to create lesson plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-plans'] });
      toast({
        title: "Success",
        description: "Lesson plan created successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create lesson plan",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/lesson-plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete lesson plan");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-plans'] });
      toast({
        title: "Success",
        description: "Lesson plan deleted successfully",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/upload-pacing-guide", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Failed to upload lesson plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-plans'] });
      toast({
        title: "Success",
        description: "Lesson plan uploaded successfully",
      });
      setIsAddDialogOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload lesson plan",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      topic: string;
      weekStart: string;
      standardIdentifier?: string;
    }) => {
      const response = await fetch(`/api/lesson-plans/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to update lesson plan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/lesson-plans'] });
      toast({
        title: "Success",
        description: "Lesson plan updated successfully",
      });
      setEditingPlan(null);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update lesson plan",
      });
    },
  });

  const handleAddPlan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!planDate || !courses?.length) return;

    const normalizedDate = startOfDay(planDate);

    const formData = new FormData(e.currentTarget);
    await addPlanMutation.mutateAsync({
      topic: formData.get("topic") as string,
      weekStart: normalizedDate.toISOString(),
      courseId: parseInt(formData.get("courseId") as string),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("date", planDate?.toISOString() || new Date().toISOString());

    await uploadMutation.mutateAsync(formData);
  };

  const handleCourseChange = (courseId: string) => {
    const course = courses?.find(c => c.id.toString() === courseId);
    if (course) {
      // Update form values here if needed for simple plan
    }
  };


  const getLessonPlansForDate = (date: Date) => {
    if (!lessonPlans) return [];
    const normalizedTargetDate = startOfDay(date);
    return lessonPlans.filter(plan => {
      const planDate = startOfDay(new Date(plan.weekStart));
      return format(normalizedTargetDate, 'yyyy-MM-dd') === format(planDate, 'yyyy-MM-dd');
    });
  };

  const renderLessonContent = (date: Date) => {
    const plans = getLessonPlansForDate(date);
    if (plans.length === 0) return null;

    return (
      <div className="flex items-center justify-center mt-1">
        <div className="bg-primary/10 text-primary rounded-sm text-xs px-2 py-1">
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
        </div>
      </div>
    );
  };

  const openAddDialog = () => {
    setPlanDate(selectedDate);
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents || 0,
      icon: Users,
    },
    {
      title: "Active Courses",
      value: stats?.totalCourses || 0,
      icon: BookOpen,
    },
    {
      title: "AI Interactions",
      value: stats?.totalChats || 0,
      icon: MessageSquare,
    },
    {
      title: "Learning Materials",
      value: stats?.totalMaterials || 0,
      icon: Brain,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <CreateCourseForm />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Lesson Calendar</CardTitle>
              <CardDescription>
                View and manage your lesson plans
              </CardDescription>
            </div>
            {selectedDate && (
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Lesson Plan</DialogTitle>
                    <DialogDescription>
                      Choose how you want to create your lesson plan
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-6 py-4">
                    <div className="flex gap-4">
                      <Button
                        variant={isSimpleAdd ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setIsSimpleAdd(true)}
                      >
                        Simple Plan
                      </Button>
                      <Button
                        variant={!isSimpleAdd ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setIsSimpleAdd(false)}
                      >
                        Advanced Options
                      </Button>
                    </div>

                    {isSimpleAdd ? (
                      <form onSubmit={handleAddPlan}>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="courseId">Course</Label>
                            <Select name="courseId" required onValueChange={handleCourseChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                              <SelectContent>
                                {courses?.map((course) => (
                                  <SelectItem
                                    key={course.id}
                                    value={course.id.toString()}
                                  >
                                    {course.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !planDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {planDate ? format(planDate, "PPP") : "Select a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={planDate}
                                  onSelect={setPlanDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="topic">Topic</Label>
                            <Textarea
                              id="topic"
                              name="topic"
                              placeholder="What will you teach?"
                              required
                              className="min-h-[100px]"
                            />
                          </div>

                          <DialogFooter className="mt-6">
                            <Button type="submit" disabled={addPlanMutation.isPending}>
                              {addPlanMutation.isPending ? "Creating..." : "Create Plan"}
                            </Button>
                          </DialogFooter>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="relative">
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => document.getElementById("lesson-plan-upload")?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Lesson Plan
                          </Button>
                          <input
                            type="file"
                            id="lesson-plan-upload"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleFileUpload}
                          />
                        </div>

                        <div className="relative">
                          <CurriculumWizard
                            defaultDate={planDate}
                            onSuccess={() => {
                              setIsAddDialogOpen(false);
                              queryClient.invalidateQueries({ queryKey: ['/api/lesson-plans'] });
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <TableHead key={day} className="text-center h-8">
                      {day}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, weekIndex) => (
                  <TableRow key={weekIndex}>
                    {Array.from({ length: 7 }).map((_, dayIndex) => {
                      const date = new Date();
                      date.setDate(date.getDate() - date.getDay() + dayIndex + weekIndex * 7);
                      const isSelected = selectedDate &&
                        format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                      return (
                        <TableCell
                          key={dayIndex}
                          className={`h-16 p-1 align-top cursor-pointer hover:bg-accent transition-colors
                            ${isSelected ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedDate(date)}
                        >
                          <div className="flex flex-col h-full">
                            <span className="text-sm font-medium">
                              {format(date, 'd')}
                            </span>
                            {renderLessonContent(date)}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {selectedDate && getLessonPlansForDate(selectedDate).length > 0 && (
            <div className="border-t p-4 space-y-2">
              <h3 className="font-medium text-sm">
                Plans for {format(selectedDate, 'MMMM d, yyyy')}:
              </h3>
              {getLessonPlansForDate(selectedDate).map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between bg-muted p-2 rounded-lg text-sm"
                >
                  <span>{plan.topic}</span>
                  <div className="space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingPlan(plan);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(plan.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Edit Dialog */}
      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lesson Plan</DialogTitle>
              <DialogDescription>
                Make changes to your lesson plan below
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateMutation.mutate({
                id: editingPlan.id,
                topic: formData.get("topic") as string,
                weekStart: new Date(formData.get("weekStart") as string).toISOString(),
                standardIdentifier: editingPlan.standard?.identifier,
              });
            }}
            className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Textarea
                  name="topic"
                  defaultValue={editingPlan.topic}
                  placeholder="Enter lesson topic..."
                />
              </div>
              <div className="space-y-2">
                <Label>Week Start</Label>
                <input
                  type="date"
                  name="weekStart"
                  defaultValue={format(new Date(editingPlan.weekStart), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              {editingPlan.standard && (
                <div className="space-y-2">
                  <Label>Standard</Label>
                  <p className="text-sm text-muted-foreground">
                    {editingPlan.standard.description}
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>
            Student interactions and material uploads over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="chats" fill="hsl(var(--primary))" name="AI Chats" />
                <Bar
                  dataKey="materials"
                  fill="hsl(var(--secondary))"
                  name="Materials"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}