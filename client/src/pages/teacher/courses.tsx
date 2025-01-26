import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import CreateCourseForm from "@/components/teacher/create-course-form";
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
import { Input } from "@/components/ui/input";
import { Trash2, Users, Book, CalendarRange } from "lucide-react";
import type { Course } from "@db/schema";

export default function Courses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: number) => {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete course");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({ title: "Success", description: "Course deleted successfully" });
      setIsDeleteOpen(false);
      setSelectedCourse(null);
      setDeleteConfirmation("");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete course",
      });
    },
  });

  const handleDelete = () => {
    if (!selectedCourse) return;

    const expectedConfirmation = `delete-${selectedCourse.name.toLowerCase()}`;
    if (deleteConfirmation.toLowerCase() !== expectedConfirmation) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Confirmation text doesn't match",
      });
      return;
    }

    deleteMutation.mutate(selectedCourse.id);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Courses</h1>
        <CreateCourseForm />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course) => (
          <Card key={course.id}>
            <CardHeader>
              <CardTitle>{course.name}</CardTitle>
              <CardDescription>
                {course.subject} - Grade {course.gradeLevel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{course.description}</p>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Course Code:</p>
                  <p className="text-xl font-mono font-bold">{course.courseCode}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Share this code with your students
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/lesson-plans?courseId=${course.id}`}>
                      <CalendarRange className="mr-2 h-4 w-4" />
                      Lessons
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/admin?courseId=${course.id}`}>
                      <Users className="mr-2 h-4 w-4" />
                      Students
                    </Link>
                  </Button>
                </div>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setSelectedCourse(course);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Course
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <span className="font-semibold"> {selectedCourse?.name}</span>,
              including all lesson plans and student enrollments.
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Type <span className="font-mono">delete-{selectedCourse?.name.toLowerCase()}</span> to confirm:
                </p>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type confirmation here"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteConfirmation("");
              setSelectedCourse(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}