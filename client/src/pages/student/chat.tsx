import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ChatInterface from "@/components/chat/chat-interface";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Course } from "@db/schema";

export default function StudentChat() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['/api/courses', courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}`, {
        credentials: 'include'
      });
      return res.json();
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!course) {
    return <div>Course not found</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Chat with AI Tutor - {course.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatInterface courseId={parseInt(courseId)} />
        </CardContent>
      </Card>
    </div>
  );
}
