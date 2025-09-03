
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, Phone, Check, RefreshCw } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

// Map of usernames to their full email addresses
const USER_EMAIL_MAP: Record<string, string> = {
  'admin0': 'blueskyincowner.0@outlook.com',
  'staff0': 'blueskyincstaff.0@outlook.com',
  'superadmin': 'blueskyincsupera.0@outlook.com',
  'manager0': 'blueskyincmanager.0@outlook.com',
  'bidder0': 'blueskyincbidder.0@outlook.com'
};

// Define a schema for login form validation
const loginSchema = z.object({
  identifier: z.string().min(1, "Username or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Define a schema for signup form validation with Philippines phone number
const signupSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z
    .string()
    .refine((val) => /^(\+63|0)9\d{9}$/.test(val), {
      message: "Must be a valid Philippines phone number (+639XXXXXXXXX or 09XXXXXXXXX)",
    }),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and conditions",
  }),
  captchaValue: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const Login: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [captchaValue, setCaptchaValue] = useState<string>("");
  const [isCaptchaVerifying, setIsCaptchaVerifying] = useState(false);
  
  const {
    login,
    isAuthenticated,
    profile,
    getRoleBasedLandingPage
  } = useAuth();
  const navigate = useNavigate();

  // Setup login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Setup signup form
  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      agreedToTerms: false,
      captchaValue: "",
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    console.log("Login component - isAuthenticated:", isAuthenticated);
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle login form submission
  const handleLoginSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      const loginEmail = USER_EMAIL_MAP[values.identifier] || values.identifier;
      const success = await login(loginEmail, values.password);
      
      if (success) {
        // Get role-based landing page
        const landingPage = profile ? getRoleBasedLandingPage(profile.role) : '/dashboard';
        toast({
          title: "Login successful",
          description: `Welcome back!`
        });
        navigate(landingPage);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simulate CAPTCHA verification for demo purposes
  const verifyCaptcha = async () => {
    setIsCaptchaVerifying(true);
    // In a real implementation, you would verify with reCAPTCHA service
    await new Promise(resolve => setTimeout(resolve, 1000));
    const randomValue = Math.random().toString(36).substring(2, 15);
    setCaptchaValue(randomValue);
    signupForm.setValue("captchaValue", randomValue);
    setIsCaptchaVerifying(false);
    toast({
      title: "CAPTCHA verified",
      description: "Verification successful"
    });
  };

  // Handle signup form submission using secure edge function
  const handleSignupSubmit = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    try {
      // Call the secure signup edge function
      const { data, error } = await supabase.functions.invoke('auth-signup', {
        body: {
          fullName: values.fullName,
          email: values.email,
          password: values.password,
          confirmPassword: values.confirmPassword,
          phoneNumber: values.phoneNumber
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create account');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Success - switch to login tab and prefill email
      toast({
        title: "Account created successfully!",
        description: "Please log in with your new account."
      });
      
      setActiveTab("login");
      loginForm.setValue("identifier", data.email || values.email);
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        variant: "destructive",
        title: "Signup Error",
        description: error.message || "An unexpected error occurred. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-200 backdrop-blur-sm relative">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-primary/5 via-sky-secondary/10 to-sky-accent/15"></div>
      <Card className="w-full max-w-md relative z-10 backdrop-blur-sm shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl">Skyshier</CardTitle>
          <CardDescription>
            Sign in to your authorized account or register as a bidder
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username or Email</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your username or email" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Enter your password" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
                  <FormField
                    control={signupForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your full name" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              type="email" 
                              placeholder="Enter your email address" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Philippines)</FormLabel>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="+639XXXXXXXXX or 09XXXXXXXXX" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                        <p className="text-xs text-muted-foreground mt-1">
                          Must be a valid Philippines phone number
                        </p>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Create a password" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              {...field} 
                              type="password" 
                              placeholder="Confirm your password" 
                              className="pl-10" 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="captchaValue"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-2 mt-2 p-3 border rounded-md bg-gray-50">
                          <FormControl>
                            <input type="hidden" {...field} />
                          </FormControl>
                          {captchaValue ? (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Check className="h-4 w-4" />
                              <span>Verification completed</span>
                            </div>
                          ) : (
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={verifyCaptcha}
                              disabled={isCaptchaVerifying}
                              className="text-sm"
                            >
                              {isCaptchaVerifying ? (
                                <>
                                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                'Verify CAPTCHA'
                              )}
                            </Button>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={signupForm.control}
                    name="agreedToTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-2 border rounded-md">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 mt-1"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            I agree to the terms and conditions and privacy policy
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isSubmitting || !captchaValue || !signupForm.getValues("agreedToTerms")}
                  >
                    {isSubmitting ? 'Creating account...' : 'Sign Up as Bidder'}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          
          <div className="pt-4 border-t text-center text-sm">
            <p className="text-muted-foreground">
              Skyshier - Secure Access Portal
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
