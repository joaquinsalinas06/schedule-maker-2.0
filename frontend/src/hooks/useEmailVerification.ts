'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/auth';

export interface EmailVerificationStatus {
  has_verification: boolean;
  is_verified: boolean;
  is_expired: boolean;
  can_resend: boolean;
  attempts_left: number;
  expires_at?: string;
  created_at?: string;
}

export interface UseEmailVerificationReturn {
  // State
  isLoading: boolean;
  isResending: boolean;
  status: EmailVerificationStatus | null;
  
  // Actions
  sendVerification: (email: string) => Promise<boolean>;
  verifyCodeAndLogin: (email: string, code: string) => Promise<{ success: boolean; hasUser: boolean; tokens?: { access_token: string; refresh_token: string; user: any } }>;
  resendVerification: (email: string) => Promise<boolean>;
  checkStatus: (email: string) => Promise<EmailVerificationStatus | null>;
  
  // Helpers
  isEmailVerified: (email: string) => Promise<boolean>;
}

export function useEmailVerification(): UseEmailVerificationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [status, setStatus] = useState<EmailVerificationStatus | null>(null);
  const { toast } = useToast();

  const sendVerification = useCallback(async (email: string): Promise<boolean> => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const result = await authService.sendVerification(email);

      // Handle direct response or wrapped response
      const actualResult = result.result || result;

      if (actualResult.data) {
        toast({
          title: "Verification code sent",
          description: `Check your email at ${email}`,
        });
        await checkStatus(email);
        return true;
      } else {
        toast({
          title: "Error",
          description: actualResult.message || "Failed to send verification code",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Send verification error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  const resendVerification = useCallback(async (email: string): Promise<boolean> => {
    if (!email) {
      toast({
        title: "Error",
        description: "Email address is required",
        variant: "destructive",
      });
      return false;
    }

    setIsResending(true);
    try {
      const result = await authService.resendVerification(email);

      // Handle direct response or wrapped response  
      const actualResult = result.result || result;

      if (actualResult.success) {
        toast({
          title: "Code resent",
          description: `New verification code sent to ${email}`,
        });
        await checkStatus(email);
        return true;
      } else {
        toast({
          title: "Error", 
          description: actualResult.message || "Failed to resend verification code",
          variant: "destructive",
        });
        return false;
      }
    } catch (error: any) {
      console.error('Resend verification error:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to resend verification code. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsResending(false);
    }
  }, [toast]);

  const checkStatus = useCallback(async (email: string): Promise<EmailVerificationStatus | null> => {
    if (!email) return null;

    try {
      const result = await authService.checkVerificationStatus(email);
      
      // Handle direct response or wrapped response
      const actualResult = result.result || result;
      
      if (actualResult.data) {
        setStatus(actualResult.data);
        return actualResult.data;
      } else {
        console.error('Check status error:', actualResult.message || 'Unknown error');
        console.error('Full response:', result);
        return null;
      }
    } catch (error: any) {
      console.error('Check status error:', error);
      return null;
    }
  }, []);

  const isEmailVerified = useCallback(async (email: string): Promise<boolean> => {
    const status = await checkStatus(email);
    return status?.is_verified || false;
  }, [checkStatus]);

  const verifyCodeAndLogin = useCallback(async (email: string, code: string): Promise<{ success: boolean; hasUser: boolean; tokens?: { access_token: string; refresh_token: string; user: any } }> => {
    if (!email || !code) {
      toast({
        title: "Error",
        description: "Email and verification code are required",
        variant: "destructive",
      });
      return { success: false, hasUser: false };
    }

    setIsLoading(true);
    try {
      const result = await authService.verifyCodeAndLogin(email, code.trim());

      // Extract the actual response data
      const actualResult = result.result || result;
      
      // Check if response is successful (has data)
      if (actualResult.data) {
        if (actualResult.data.access_token && actualResult.data.user) {
          // User exists and is now logged in
          toast({
            title: "Welcome back!",
            description: "Redirecting to dashboard...",
            variant: "default",
          });
          await checkStatus(email);
          return { 
            success: true, 
            hasUser: true, 
            tokens: {
              access_token: actualResult.data.access_token,
              refresh_token: actualResult.data.refresh_token,
              user: actualResult.data.user
            }
          };
        } else if (actualResult.data.verified || actualResult.data.needs_registration) {
          // Email verified but user needs to complete registration
          toast({
            title: "Email verified successfully!",
            description: "Completing your registration...",
            variant: "default",
          });
          await checkStatus(email);
          return { success: true, hasUser: false };
        } else {
          // Email verified but unclear state - default to needs registration
          toast({
            title: "Email verified successfully!",
            description: "Completing your registration...",
            variant: "default",
          });
          await checkStatus(email);
          return { success: true, hasUser: false };
        }
      } else {
        toast({
          title: "Verification failed",
          description: actualResult.message || "The verification code is invalid or expired",
          variant: "destructive",
        });
        await checkStatus(email); // Refresh status after failed attempt
        return { success: false, hasUser: false };
      }
    } catch (error: any) {
      console.error('Verify code and login error:', error);
      toast({
        title: "Connection error",
        description: error.response?.data?.detail || "Failed to verify code. Please try again.",
        variant: "destructive",
      });
      return { success: false, hasUser: false };
    } finally {
      setIsLoading(false);
    }
  }, [toast, checkStatus]);

  return {
    // State
    isLoading,
    isResending,
    status,
    
    // Actions
    sendVerification,
    verifyCodeAndLogin,
    resendVerification,
    checkStatus,
    
    // Helpers
    isEmailVerified,
  };
}
