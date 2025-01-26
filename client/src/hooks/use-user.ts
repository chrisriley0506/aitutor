import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

type LoginData = {
  username: string;
  password: string;
  role?: "student" | "teacher";
};

async function fetchUser(): Promise<User | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}

type RequestResult = {
  ok: true;
  user?: User;
} | {
  ok: false;
  message: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: LoginData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status >= 500) {
        return { ok: false, message: response.statusText };
      }

      const message = await response.text();
      return { ok: false, message };
    }

    const data = await response.json();
    return { ok: true, user: data.user };
  } catch (e: any) {
    return { ok: false, message: e.toString() };
  }
}

export function useUser() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<User | null>({
    queryKey: ['/api/user'],
    queryFn: fetchUser,
    retry: false,
    staleTime: Infinity
  });

  const loginMutation = useMutation({
    mutationFn: (userData: LoginData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        toast({
          title: "Success",
          description: "Login successful",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (userData: LoginData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        toast({
          title: "Success",
          description: "Registration successful",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
  });

  return {
    user,
    isLoading: isLoading && !error,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: async () => {
      const result = await handleRequest('/api/logout', 'POST');
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        toast({
          title: "Success",
          description: "Logged out successfully",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    },
  };
}