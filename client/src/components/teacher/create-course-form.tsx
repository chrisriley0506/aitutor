import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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

type FormData = {
  name: string;
  description: string;
  subject: string;
  gradeLevel: string;
  standardType: 'common_core' | 'state';
  state?: string;
};

const SUBJECTS = [
  "Mathematics",
  "English Language Arts",
  "Science",
  "Social Studies",
  "Foreign Language",
  "Art",
  "Music",
  "Physical Education",
];

const GRADE_LEVELS = [
  "K", "1", "2", "3", "4", "5", "6", "7", "8",
  "9", "10", "11", "12",
];

const US_STATES = [
  { code: "CA", name: "California" },
  { code: "NY", name: "New York" },
  { code: "TX", name: "Texas" },
  // Add more states as needed
];

export default function CreateCourseForm() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [courseCode, setCourseCode] = useState<string>();
  const queryClient = useQueryClient();

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>();

  const standardType = watch("standardType");
  const subject = watch("subject");
  const gradeLevel = watch("gradeLevel");

  const { data: standards } = useQuery({
    queryKey: ['/api/standards', standardType, subject, gradeLevel],
    enabled: !!standardType && !!subject && !!gradeLevel,
  });

  const createCourseMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          subject: data.subject,
          gradeLevel: data.gradeLevel,
          standardType: data.standardType,
          state: data.state,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create course");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      setCourseCode(data.courseCode);
      toast({
        title: "Success",
        description: "Course created successfully",
      });
      reset();
      setStep(1);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    createCourseMutation.mutate(data);
  };

  const handleClose = () => {
    setOpen(false);
    setCourseCode(undefined);
    setStep(1);
    reset();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name</Label>
              <Input
                id="name"
                {...register("name", { required: "Course name is required" })}
                placeholder="e.g., Introduction to Mathematics"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description", { required: "Description is required" })}
                placeholder="Provide a brief description of the course..."
                className="min-h-[100px]"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={subject}
                onValueChange={(value) => setValue("subject", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>
                      {subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject?.message || "Subject is required"}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select
                value={gradeLevel}
                onValueChange={(value) => setValue("gradeLevel", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade} value={grade}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gradeLevel && (
                <p className="text-sm text-destructive">{errors.gradeLevel?.message || "Grade Level is required"}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Standards Type</Label>
              <Select
                value={standardType}
                onValueChange={(value: 'common_core' | 'state') => setValue("standardType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select standards type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common_core">Common Core</SelectItem>
                  <SelectItem value="state">State Standards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {standardType === 'state' && (
              <div className="space-y-2">
                <Label>State</Label>
                <Select
                  value={watch("state")}
                  onValueChange={(value) => setValue("state", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {courseCode ? "Course Created" : `Create New Course (Step ${step} of 3)`}
          </DialogTitle>
        </DialogHeader>
        {courseCode ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">Course Code:</p>
              <p className="text-2xl font-mono font-bold">{courseCode}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Share this code with your students to let them join the course
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {renderStepContent()}
            <div className="flex justify-between">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
              <Button
                type="submit"
                className={step === 1 ? "w-full" : ""}
                disabled={createCourseMutation.isPending}
              >
                {step < 3 ? (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : createCourseMutation.isPending ? (
                  "Creating..."
                ) : (
                  "Create Course"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}