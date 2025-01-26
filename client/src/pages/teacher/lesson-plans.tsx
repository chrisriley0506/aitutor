import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CurriculumWizard } from "@/components/teacher/curriculum-wizard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import type { Course, WeeklyTopic } from "@db/schema";
import { PacingGuideWizard } from "@/components/teacher/pacing-guide-wizard";

type LessonPlan = WeeklyTopic & {
  standard?: {
    identifier: string;
    description: string;
    subject: string;
    gradeLevel: string;
  };
};

function EditLessonPlanDialog({
  lessonPlan,
  isOpen,
  onClose,
}: {
  lessonPlan: LessonPlan;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState(lessonPlan.topic);
  const [weekStart, setWeekStart] = useState<Date>(new Date(lessonPlan.weekStart));

  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/lesson-plans/${lessonPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          weekStart,
          standardIdentifier: lessonPlan.standardIdentifier,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update lesson plan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lesson-plans", lessonPlan.courseId] });
      toast({ title: "Success", description: "Lesson plan updated successfully" });
      onClose();
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update lesson plan",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Lesson Plan</DialogTitle>
          <DialogDescription>
            Make changes to your lesson plan below
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Topic</label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter lesson topic..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Lesson Date</label>
            <Calendar
              mode="single"
              selected={weekStart}
              onSelect={(date) => date && setWeekStart(date)}
              className="rounded-md border"
            />
          </div>
          {lessonPlan.standard && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Standard</label>
              <p className="text-sm text-muted-foreground">
                {lessonPlan.standard.description}
              </p>
            </div>
          )}
          <Button
            className="w-full"
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CourseCard({ course, onImport }: { course: Course; onImport: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: lessonPlans, isLoading } = useQuery<LessonPlan[]>({
    queryKey: [`/api/lesson-plans/${course.id}`],
  });

  // Sort lesson plans by date
  const sortedLessonPlans = lessonPlans?.sort((a, b) =>
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );

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
      queryClient.invalidateQueries({ queryKey: [`/api/lesson-plans/${course.id}`] });
      toast({ title: "Success", description: "Lesson plan deleted successfully" });
      setIsDeleteOpen(false);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete lesson plan",
      });
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{course.name}</CardTitle>
          <CardDescription>
            {course.subject} - Grade {course.gradeLevel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : sortedLessonPlans && sortedLessonPlans.length > 0 ? (
              <div className="space-y-4">
                {sortedLessonPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(plan.weekStart).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-base mt-1">
                          {plan.topic}
                        </p>
                        {plan.standard && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Standard: {plan.standard.identifier}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsEditOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setIsDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No lesson plans created yet.
              </p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedPlan && (
        <EditLessonPlanDialog
          lessonPlan={selectedPlan}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedPlan(null);
          }}
        />
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this lesson plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPlan && deleteMutation.mutate(selectedPlan.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function LessonPlans() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const queryClient = useQueryClient();
  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const handleImportSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Lesson Plans</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsImportOpen(true)} variant="outline">
            Import Pacing Guide
          </Button>
          <CurriculumWizard />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course) => (
          <CourseCard 
            key={course.id} 
            course={course} 
            onImport={() => {
              setSelectedCourseId(course.id.toString());
              setIsImportOpen(true);
            }}
          />
        ))}
      </div>

      <PacingGuideWizard
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false);
          setSelectedCourseId(undefined);
        }}
        onSuccess={handleImportSuccess}
        courseId={selectedCourseId}
      />
    </div>
  );
}