
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../contexts/AuthContext';
import { toast } from "@/components/ui/use-toast";

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    
    setIsSubmitting(true);
    try {
      const success = await login(email, password);
      
      if (success) {
        navigate('/dashboard');
        toast({
          title: "Login successful",
          description: `Welcome back!`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid credentials or your account may not be set up in the system.",
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl">BlueSky Inc.</CardTitle>
          <CardDescription>
            Sign in with your authorized account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          
          <div className="pt-4 border-t text-center text-sm">
            <p className="text-muted-foreground">
              POS System Authorized Access Only
            </p>
          </div>

          <div className="border p-4 rounded-md bg-muted/30 text-sm">
            <h3 className="font-semibold mb-2">Test Account Credentials:</h3>
            <p><strong>Staff account:</strong> staff@bluesky.com / staff123</p>
            <p><strong>Admin account:</strong> admin@bluesky.com / admin123</p>
            <p><strong>Super Admin:</strong> superadmin@bluesky.com / superadmin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
