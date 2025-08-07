'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEmailVerification, EmailVerificationStatus } from '@/hooks/useEmailVerification';

interface EmailVerificationProps {
  email: string;
  onVerificationComplete: () => void;
  onEmailChange?: (email: string) => void;
  isEmbedded?: boolean;
}

export default function EmailVerification({ 
  email, 
  onVerificationComplete, 
  onEmailChange,
  isEmbedded = false 
}: EmailVerificationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasCodeSent, setHasCodeSent] = useState(false);
  const { toast } = useToast();
  
  const { 
    isLoading, 
    isResending, 
    status, 
    sendVerification, 
    verifyCodeAndLogin,
    resendVerification,
    checkStatus 
  } = useEmailVerification();

  // Check verification status on component mount
  useEffect(() => {
    if (email) {
      checkVerificationStatus();
    }
  }, [email]);

  // Auto-send verification code if this is an embedded component (registration flow)
  useEffect(() => {
    if (email && isEmbedded && !hasCodeSent && !isLoading) {
      handleSendVerification();
    }
  }, [email, isEmbedded, hasCodeSent, isLoading]);

  // Countdown timer for expiration
  useEffect(() => {
    if (!status?.expires_at) return;

    const updateTimeLeft = () => {
      const expiresAt = new Date(status.expires_at!);
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      console.log('Time left:', diff);
      
      if (diff <= 0) {
        setTimeLeft(0);
        checkVerificationStatus(); // Refresh status when expired
      } else {
        setTimeLeft(Math.floor(diff / 1000));
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [status?.expires_at]);

  const checkVerificationStatus = async () => {
    if (!email) return;
    
    const newStatus = await checkStatus(email);
    if (newStatus) {
      setIsVerified(newStatus.is_verified);
      setHasCodeSent(newStatus.has_verification);
      
      if (newStatus.is_verified) {
        onVerificationComplete();
      }
    } else {
      // If status check fails, don't block the functionality
      console.warn('Status check failed for email:', email);
    }
  };

  const handleSendVerification = async () => {
    const success = await sendVerification(email);
    if (success) {
      setHasCodeSent(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    const result = await verifyCodeAndLogin(email, verificationCode.trim());
    
    if (result.success) {
      setIsVerified(true);
      
      if (result.hasUser && result.tokens) {
        // User exists and is now logged in - store tokens and redirect
        localStorage.setItem('access_token', result.tokens.access_token);
        if (result.tokens.refresh_token) {
          localStorage.setItem('refresh_token', result.tokens.refresh_token);
        }
        
        // Redirect to dashboard (toast already shown by verifyCodeAndLogin)
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        // Email verified but user needs to complete registration
        // Don't show toast here as verifyCodeAndLogin already shows it
        onVerificationComplete();
      }
    } else {
      setVerificationCode('');
    }
  };

  const handleResendCode = async () => {
    const success = await resendVerification(email);
    if (success) {
      setVerificationCode('');
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isVerified) {
    return (
      <Card className={isEmbedded ? "border-green-200 bg-green-50" : ""}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Email verified successfully!</p>
              <p className="text-sm text-green-600/80">{email}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={isEmbedded ? "border-blue-200" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Verification
        </CardTitle>
        <CardDescription>
          {hasCodeSent 
            ? "Enter the 6-digit code sent to your email"
            : "Verify your email address to continue"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email input (if not embedded) */}
        {!isEmbedded && onEmailChange && (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="Enter your email address"
              disabled={hasCodeSent}
              className="border-slate-600 bg-slate-800/50 backdrop-blur-sm focus:border-cyan-400 focus:ring-cyan-400/20 disabled:bg-slate-700 disabled:text-slate-400 text-white placeholder:text-slate-400"
            />
          </div>
        )}

        {/* Send verification button - only show for non-embedded components */}
        {!hasCodeSent && !isEmbedded && (
          <Button 
            onClick={handleSendVerification} 
            disabled={isLoading || !email}
            className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Enviando...' : 'Enviar Código de Verificación'}
          </Button>
        )}

        {/* Auto-sending message for embedded components */}
        {!hasCodeSent && isEmbedded && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enviando código de verificación...</span>
            </div>
          </div>
        )}

        {/* Verification code input */}
        {hasCodeSent && !isVerified && (
          <>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-foreground font-medium">Código de Verificación</Label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setVerificationCode(value);
                }}
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl font-bold tracking-[0.5em] h-14 border-2 border-slate-600 bg-gradient-to-r from-slate-800 to-slate-700 shadow-inner rounded-xl focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 focus:shadow-lg transition-all duration-200 text-white placeholder:text-slate-400 placeholder:font-normal"
              />
              <p className="text-xs text-muted-foreground text-center">
                Ingresa el código de 6 dígitos enviado a tu email
              </p>
            </div>

            <Button 
              onClick={handleVerifyCode} 
              disabled={isLoading || verificationCode.length !== 6}
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Verificando...' : 'Verificar Email'}
            </Button>

            {/* Status information */}
            {status && (
              <div className="space-y-3">
                {/* Timer */}
                {timeLeft !== null && timeLeft > 0 && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      El código expira en {formatTimeLeft(timeLeft)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Expired notice */}
                {status.is_expired && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      El código de verificación ha expirado. Por favor solicita uno nuevo.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Attempts left */}
                {status.attempts_left <= 1 && status.attempts_left > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {status.attempts_left} intento restante
                    </AlertDescription>
                  </Alert>
                )}

                {/* Resend button */}
                {status.can_resend && (
                  <Button 
                    variant="outline" 
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="w-full h-10 border-2 border-slate-600 bg-slate-800/50 hover:bg-slate-700 text-slate-200 hover:text-white font-medium transition-all duration-200 hover:border-slate-500 hover:shadow-md"
                  >
                    {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isResending ? 'Reenviando...' : 'Reenviar Código'}
                  </Button>
                )}

                {/* Max attempts reached */}
                {!status.can_resend && status.attempts_left === 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Se alcanzó el máximo de intentos de verificación. Por favor intenta más tarde o usa un email diferente.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
