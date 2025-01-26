import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useForm } from "react-hook-form";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FormData = {
  username: string;
  password: string;
  role?: "student" | "teacher";
};

export default function AuthPage() {
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerForm, handleSubmit, reset, setValue } = useForm<FormData>();

  const onSubmit = async (data: FormData, isLogin: boolean) => {
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(data);
      } else {
        await register(data);
      }
    } finally {
      setIsLoading(false);
      reset();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex items-center">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="h-6 w-6" />
            <CardTitle className="text-2xl font-bold">AI Tutor</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, true))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    {...registerForm("username", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    {...registerForm("password", { required: true })}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  Login
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form
                onSubmit={handleSubmit((data) => onSubmit(data, false))}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    {...registerForm("username", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    {...registerForm("password", { required: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <RadioGroup
                    defaultValue="student"
                    onValueChange={(value: "student" | "teacher") =>
                      setValue("role", value)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="student" id="student" />
                      <Label htmlFor="student">Student</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teacher" id="teacher" />
                      <Label htmlFor="teacher">Teacher</Label>
                    </div>
                  </RadioGroup>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  Register
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}