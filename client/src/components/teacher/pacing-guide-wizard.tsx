import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";

interface PacingGuideWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  courseId?: string;
}

interface Lesson {
  day: number;
  title: string;
  standard: string | null;
}

interface Course {
  id: number;
  name: string;
  subject: string;
  gradeLevel: string;
}

export function PacingGuideWizard({ isOpen, onClose, onSuccess, courseId: propCourseId }: PacingGuideWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(propCourseId || "");
  const [preview, setPreview] = useState<Lesson[]>([]);
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");
  const [standardsSystem, setStandardsSystem] = useState("commonCore");
  const [startDate, setStartDate] = useState<Date>(new Date());

  const { toast } = useToast();

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const response = await fetch("/api/upload-pacing-guide", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 429) {
            throw new Error("The AI service is currently busy. Please try again in a few moments.");
          } else if (errorText.includes("OpenAI")) {
            throw new Error("There was an issue with the AI service. Please try again in a few moments.");
          }
          throw new Error(errorText);
        }

        const data = await response.json();
        return data.lessons as Lesson[];
      } catch (error) {
        console.error("Upload error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setPreview(data);
      setStep(2);
      toast({
        title: "Success",
        description: "PDF processed successfully",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload pacing guide",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const dates = preview.map((_, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        return date.toISOString().split('T')[0];
      });

      const response = await fetch('/api/save-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: selectedCourseId,
          dates,
          lessons: preview,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lesson plans saved successfully",
      });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save lesson plans",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedCourseId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a course and upload a file",
      });
      return;
    }

    const selectedCourse = courses?.find(course => course.id.toString() === selectedCourseId);
    if (!selectedCourse) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selected course not found",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", selectedCourseId);
    formData.append("grade", selectedCourse.gradeLevel);
    formData.append("subject", selectedCourse.subject);
    formData.append("startPage", startPage);
    formData.append("endPage", endPage);
    formData.append("standardsSystem", standardsSystem);

    await uploadMutation.mutateAsync(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Pacing Guide</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Upload your pacing guide PDF document"
              : "Review the extracted lessons and set start date"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {step === 1 ? (
            <div className="space-y-4">
              {!propCourseId && (
                <div className="space-y-2">
                  <Label>Select Course</Label>
                  <Select
                    value={selectedCourseId}
                    onValueChange={setSelectedCourseId}
                    disabled={coursesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses?.map((course) => (
                        <SelectItem key={course.id} value={course.id.toString()}>
                          {course.name} - Grade {course.gradeLevel} {course.subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Upload PDF</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
              </div>

              {file && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Page</Label>
                      <Input
                        type="number"
                        min="1"
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Page (Optional)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={endPage}
                        onChange={(e) => setEndPage(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Standards System</Label>
                    <Select value={standardsSystem} onValueChange={setStandardsSystem}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select standards system" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="commonCore">Common Core</SelectItem>
                        <SelectItem value="stateStandards">State Standards</SelectItem>
                        <SelectItem value="custom">Custom Standards</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || !selectedCourseId || !file || coursesLoading}
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Upload and Process"
                    )}
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2 mb-4">
                <Label>Select Start Date</Label>
                <div className="border rounded-md p-4">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {preview.map((lesson, index) => {
                const lessonDate = new Date(startDate);
                lessonDate.setDate(lessonDate.getDate() + index);

                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        {lessonDate.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-base font-medium">{lesson.title}</p>
                    {lesson.standard && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Standard: {lesson.standard}
                      </p>
                    )}
                  </div>
                );
              })}

              <Button
                className="w-full mt-4"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Lesson Plans"
                )}
              </Button>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}