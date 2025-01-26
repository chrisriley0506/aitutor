import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Course, WeeklyTopic } from "@db/schema";

export default function TeacherTraining() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>();

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: currentTopic } = useQuery<WeeklyTopic>({
    queryKey: ['/api/weekly-topic', selectedCourse],
    enabled: !!selectedCourse,
  });

  const materialMutation = useMutation({
    mutationFn: async (data: {
      courseId: number;
      title: string;
      content: string;
      type: string;
    }) => {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create material");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/materials'] });
      toast({
        title: "Success",
        description: "Material uploaded successfully",
      });
    },
  });

  const weeklyTopicMutation = useMutation({
    mutationFn: async (data: { courseId: number; topic: string }) => {
      const response = await fetch("/api/weekly-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update weekly topic");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/weekly-topic'] });
      toast({
        title: "Success",
        description: "Weekly topic updated successfully",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!selectedCourse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a course",
      });
      return;
    }

    await materialMutation.mutateAsync({
      courseId: parseInt(selectedCourse),
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      type: formData.get("type") as string,
    });

    form.reset();
  };

  const handleTopicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!selectedCourse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a course",
      });
      return;
    }

    await weeklyTopicMutation.mutateAsync({
      courseId: parseInt(selectedCourse),
      topic: formData.get("topic") as string,
    });

    form.reset();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Course Management</h1>

      <div className="space-y-2">
        <Label>Select Course</Label>
        <Select
          value={selectedCourse}
          onValueChange={setSelectedCourse}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {courses?.map((course) => (
              <SelectItem key={course.id} value={course.id.toString()}>
                {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Topic</CardTitle>
          <CardDescription>
            Set this week's learning topic to help the AI tutor provide relevant assistance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTopicSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">This Week's Topic</Label>
              <Textarea
                id="topic"
                name="topic"
                placeholder="What are you teaching this week?"
                defaultValue={currentTopic?.topic}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={weeklyTopicMutation.isPending}
              className="w-full"
            >
              Update Weekly Topic
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload New Material</CardTitle>
          <CardDescription>
            Add standards, guides, or lesson plans to enhance the AI tutor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesson_plan">Lesson Plan</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                name="content"
                required
                className="min-h-[200px]"
              />
            </div>

            <Button
              type="submit"
              disabled={materialMutation.isPending}
              className="w-full"
            >
              Upload Material
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}