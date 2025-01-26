import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Brain, MessageSquare, Timer, TrendingUp } from "lucide-react";
import type { Course } from "@db/schema";

type StudentActivity = {
  id: number;
  username: string;
  totalSessions: number;
  avgDuration: number;
  questionsAsked: number;
  lastActive: string;
};

type EngagementData = {
  date: string;
  sessions: number;
  questions: number;
  duration: number;
};

type CourseStats = {
  totalStudents: number;
  averageSessionDuration: number;
  totalQuestions: number;
  activeStudents: number;
  engagementTrend: EngagementData[];
  studentActivity: StudentActivity[];
};

export default function TeacherReports() {
  const [selectedCourse, setSelectedCourse] = useState<string>();

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const { data: courseStats } = useQuery<CourseStats>({
    queryKey: ['/api/courses/stats', selectedCourse],
    enabled: !!selectedCourse,
  });

  const statCards = courseStats
    ? [
        {
          title: "Active Students",
          value: courseStats.activeStudents,
          description: "Students active this week",
          icon: Brain,
        },
        {
          title: "Avg. Session Duration",
          value: `${Math.round(courseStats.averageSessionDuration)} min`,
          description: "Time spent with AI tutor",
          icon: Timer,
        },
        {
          title: "Total Questions",
          value: courseStats.totalQuestions,
          description: "Questions asked to AI",
          icon: MessageSquare,
        },
        {
          title: "Engagement Rate",
          value: `${Math.round((courseStats.activeStudents / courseStats.totalStudents) * 100)}%`,
          description: "Of enrolled students",
          icon: TrendingUp,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Performance Reports</h1>
      </div>

      <div className="w-full max-w-xs">
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

      {courseStats ? (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                  <p className="text-xs text-muted-foreground">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>
                Student activity and interaction patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={courseStats.engagementTrend}>
                    <XAxis
                      dataKey="date"
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="questions"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="duration"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student Activity</CardTitle>
              <CardDescription>
                Detailed breakdown of individual student engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Total Sessions</TableHead>
                    <TableHead>Avg Duration</TableHead>
                    <TableHead>Questions Asked</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseStats.studentActivity.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.username}
                      </TableCell>
                      <TableCell>{student.totalSessions}</TableCell>
                      <TableCell>{student.avgDuration} min</TableCell>
                      <TableCell>{student.questionsAsked}</TableCell>
                      <TableCell>{student.lastActive}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Select a course to view performance reports
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
