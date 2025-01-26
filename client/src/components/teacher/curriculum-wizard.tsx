import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Course } from "@db/schema";

const GRADE_LEVELS = [
  "K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"
];

const SUBJECTS = [
  "Mathematics",
  "English Language Arts",
  "Science",
  "Social Studies",
  "Foreign Language",
  "Art",
  "Music",
  "Physical Education",
  "Computer Science"
];

const courseSelectionSchema = z.object({
  courseId: z.string().min(1, "Please select a course"),
});

const topicFormSchema = z.object({
  description: z.string().min(10, "Please provide a detailed description of what you'll be teaching"),
  grade: z.string().min(1, "Please select a grade level"),
  subject: z.string().min(1, "Please select a subject"),
  standardsSystem: z.enum(["commonCore", "stateStandards", "custom"]),
});

type CurriculumWizardProps = {
  defaultDate?: Date;
  onSuccess?: () => void;
};

type Standard = {
  id: string;
  description: string;
  grade: string;
  subject: string;
  confidence: number;
};

type TopicForm = z.infer<typeof topicFormSchema>;
type CourseSelectionForm = z.infer<typeof courseSelectionSchema>;

export function CurriculumWizard({ defaultDate, onSuccess }: CurriculumWizardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [selectedStandard, setSelectedStandard] = useState<Standard | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>(defaultDate ? [defaultDate] : []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const courseSelectionForm = useForm<CourseSelectionForm>({
    resolver: zodResolver(courseSelectionSchema),
    defaultValues: {
      courseId: "",
    },
  });

  const topicForm = useForm<TopicForm>({
    resolver: zodResolver(topicFormSchema),
    defaultValues: {
      description: "",
      grade: "",
      subject: "",
      standardsSystem: "commonCore",
    },
  });

  // Update topic form when selected course changes
  useEffect(() => {
    if (selectedCourse) {
      console.log('Updating form with course:', selectedCourse);
      if (selectedCourse.gradeLevel) {
        topicForm.setValue("grade", selectedCourse.gradeLevel, { shouldValidate: true });
      }
      if (selectedCourse.subject) {
        topicForm.setValue("subject", selectedCourse.subject, { shouldValidate: true });
      }
    }
  }, [selectedCourse, topicForm]);

  // Reset form when dialog closes
  const handleClose = () => {
    setDialogOpen(false);
    setStep(1);
    setSelectedCourse(null);
    courseSelectionForm.reset();
    topicForm.reset();
    setSelectedStandard(null);
    setSelectedDates([]);
    onSuccess?.();
  };

  const analyzeTopicMutation = useMutation({
    mutationFn: async (data: TopicForm & { courseId: string }) => {
      const response = await fetch("/api/analyze-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze topic");
      }

      const responseData = await response.json();
      // Set the first standard as selected by default
      if (responseData.standards?.length > 0) {
        setSelectedStandard(responseData.standards[0]);
      }
      return responseData;
    },
    onSuccess: (data) => {
      setStep(3);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to analyze topic",
      });
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: {
      standard: Standard;
      dates: Date[];
      objectives: string[];
      courseId: string;
    }) => {
      const response = await fetch("/api/save-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...data,
          standardId: data.standard.id,
          standardDescription: data.standard.description,
          standardGrade: data.standard.grade,
          standardSubject: data.standard.subject,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-topic"] });
      toast({
        title: "Success",
        description: "Curriculum plan saved successfully",
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save plan",
      });
    },
  });

  const handleCourseSelect = (values: CourseSelectionForm) => {
    const course = courses?.find(c => c.id.toString() === values.courseId);
    if (course) {
      console.log('Selected course:', course);
      setSelectedCourse(course);
      setStep(2);
    }
  };

  const handleTopicSubmit = (data: TopicForm) => {
    if (!selectedCourse) return;
    analyzeTopicMutation.mutate({
      ...data,
      courseId: selectedCourse.id.toString(),
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Plan with Standards</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Curriculum Planning Wizard</DialogTitle>
          <DialogDescription>
            Let's plan your curriculum with AI assistance
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="relative max-h-[calc(100vh-200px)] pr-6">
          <div className="space-y-6 pb-8">
            {step === 1 && (
              <Form {...courseSelectionForm}>
                <form onSubmit={courseSelectionForm.handleSubmit(handleCourseSelect)} className="space-y-4">
                  <FormField
                    control={courseSelectionForm.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Course</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a course to plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses?.map((course) => (
                              <SelectItem key={course.id} value={course.id.toString()}>
                                {course.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Next</Button>
                </form>
              </Form>
            )}

            {step === 2 && selectedCourse && (
              <Form {...topicForm}>
                <form onSubmit={topicForm.handleSubmit(handleTopicSubmit)} className="space-y-4">
                  <FormField
                    control={topicForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you teaching?</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what you'll be teaching this week..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={topicForm.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADE_LEVELS.map((grade) => (
                              <SelectItem key={grade} value={grade}>
                                Grade {grade}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={topicForm.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SUBJECTS.map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={topicForm.control}
                    name="standardsSystem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Standards System</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="commonCore" id="commonCore" />
                              <Label htmlFor="commonCore">Common Core</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="stateStandards" id="stateStandards" />
                              <Label htmlFor="stateStandards">State Standards</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="custom" id="custom" />
                              <Label htmlFor="custom">Custom Standards</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={analyzeTopicMutation.isPending}
                  >
                    {analyzeTopicMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Analyze Topic
                  </Button>
                </form>
              </Form>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Select Dates</h3>
                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onSelect={(dates) => setSelectedDates(dates || [])}
                  className="rounded-md border"
                />

                <Button
                  className="w-full"
                  disabled={selectedDates.length === 0 || !selectedStandard || savePlanMutation.isPending}
                  onClick={() =>
                    selectedCourse && selectedStandard && savePlanMutation.mutate({
                      standard: selectedStandard,
                      dates: selectedDates,
                      objectives: [],
                      courseId: selectedCourse.id.toString(),
                    })
                  }
                >
                  {savePlanMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Plan
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}