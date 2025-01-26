import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, UserPlus, Users } from "lucide-react";
import type { Course } from "@db/schema";

type Student = {
  id: number;
  username: string;
  enrolledCourses: number;
  lastActive: string;
};

type Invitation = {
  id: number;
  email: string;
  courseId: number;
  status: "pending" | "accepted";
  createdAt: string;
};

export default function TeacherAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCourse, setSelectedCourse] = useState<string>();

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students', selectedCourse],
    enabled: !!selectedCourse,
  });

  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ['/api/invitations', selectedCourse],
    enabled: !!selectedCourse,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, courseId }: { email: string; courseId: number }) => {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, courseId }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitations'] });
      toast({
        title: "Success",
        description: "Invitation sent successfully",
      });
    },
  });

  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a course",
      });
      return;
    }

    const formData = new FormData(e.currentTarget);
    await inviteMutation.mutateAsync({
      email: formData.get("email") as string,
      courseId: parseInt(selectedCourse),
    });
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Management</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New Student</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
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
              <div className="space-y-2">
                <Input
                  name="email"
                  type="email"
                  placeholder="student@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Send Invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
            <CardDescription>
              Manage students currently enrolled in your courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

              {students && students.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Courses</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.username}</TableCell>
                        <TableCell>{student.enrolledCourses}</TableCell>
                        <TableCell>{student.lastActive}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No students enrolled in this course
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Track and manage course invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations && invitations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <span className={`capitalize ${
                          invitation.status === 'accepted' 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                        }`}>
                          {invitation.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(invitation.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No pending invitations
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
