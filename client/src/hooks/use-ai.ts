import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useAI() {
  const { toast } = useToast();

  const chatMutation = useMutation({
    mutationFn: async ({ message, courseId }: { message: string; courseId: number }) => {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, courseId })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message
      });
    }
  });

  const studyPlanMutation = useMutation({
    mutationFn: async ({ courseId }: { courseId: number }) => {
      const response = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        description: error.message
      });
    }
  });

  return {
    chat: chatMutation.mutateAsync,
    getStudyPlan: studyPlanMutation.mutateAsync
  };
}
