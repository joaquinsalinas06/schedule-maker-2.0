import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
import logging
from ..utils.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_server = settings.SMTP_SERVER
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.from_email = settings.FROM_EMAIL
        self.use_tls = settings.SMTP_USE_TLS

    def send_email(self, to_email: str, subject: str, body: str, is_html: bool = False) -> bool:
        """
        Send an email to the specified recipient.
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body content
            is_html: Whether the body is HTML content
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_email
            msg['To'] = to_email
            msg['Subject'] = subject

            # Attach body
            if is_html:
                msg.attach(MIMEText(body, 'html'))
            else:
                msg.attach(MIMEText(body, 'plain'))


            # Connect to server and send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_verification_email(self, to_email: str, verification_code: str) -> bool:
        """
        Send email verification code to user.
        
        Args:
            to_email: User's email address
            verification_code: 6-digit verification code
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        subject = "Verifica tu Email - Schedule Maker"
        
        # HTML email template
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                }}
                .email-content {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }}
                .verification-code {{
                    font-size: 32px;
                    font-weight: bold;
                    color: #4F46E5;
                    text-align: center;
                    background-color: #F3F4F6;
                    padding: 20px;
                    border-radius: 8px;
                    letter-spacing: 4px;
                    margin: 20px 0;
                }}
                .message {{
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }}
                .footer {{
                    text-align: center;
                    color: #888;
                    font-size: 14px;
                    margin-top: 30px;
                }}
                .warning {{
                    background-color: #FEF3CD;
                    color: #92400E;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="email-content">
                    <div class="header">
                        <h1>Verifica tu Dirección de Email</h1>
                    </div>
                    
                    <div class="message">
                        <p>¡Gracias por registrarte en Schedule Maker! Para completar tu registro y asegurar tu cuenta, ingresa el código de verificación a continuación:</p>
                    </div>
                    
                    <div class="verification-code">
                        {verification_code}
                    </div>
                    
                    <div class="message">
                        <p>Este código de verificación expirará en <strong>15 minutos</strong>. Si no solicitaste esta verificación, ignora este email.</p>
                    </div>
                    
                    <div class="warning">
                        <strong>Aviso de Seguridad:</strong> Nunca compartas este código con nadie. Nuestro equipo nunca te pedirá este código por teléfono o email.
                    </div>
                    
                    <div class="footer">
                        <p>Si tienes problemas, por favor contacta a nuestro equipo de soporte.</p>
                        <p>&copy; 2025 Schedule Maker. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text fallback
        text_body = f"""
        Verifica tu Email - Schedule Maker
        
        ¡Gracias por registrarte en Schedule Maker! 
        
        Tu código de verificación es: {verification_code}
        
        Este código expirará en 15 minutos. Si no solicitaste esta verificación, ignora este email.
        
        Aviso de Seguridad: Nunca compartas este código con nadie. Nuestro equipo nunca te pedirá este código por teléfono o email.
        
        Si tienes problemas, contacta a nuestro equipo de soporte.

        © 2025 Schedule Maker. Todos los derechos reservados.
        """
        
        # Try HTML first, fallback to text
        if not self.send_email(to_email, subject, html_body, is_html=True):
            return self.send_email(to_email, subject, text_body, is_html=False)
        
        return True

    def send_password_reset_email(self, to_email: str, reset_token: str, reset_url: str) -> bool:
        """
        Send password reset email to user.
        
        Args:
            to_email: User's email address
            reset_token: Password reset token
            reset_url: URL for password reset
            
        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        subject = "Password Reset Request - Schedule Maker"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background-color: #f9f9f9;
                }}
                .email-content {{
                    background-color: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                .header {{
                    text-align: center;
                    color: #333;
                    margin-bottom: 30px;
                }}
                .reset-button {{
                    display: inline-block;
                    background-color: #4F46E5;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    text-align: center;
                    margin: 20px 0;
                }}
                .message {{
                    color: #555;
                    line-height: 1.6;
                    margin-bottom: 20px;
                }}
                .footer {{
                    text-align: center;
                    color: #888;
                    font-size: 14px;
                    margin-top: 30px;
                }}
                .warning {{
                    background-color: #FEF3CD;
                    color: #92400E;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 20px 0;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="email-content">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    
                    <div class="message">
                        <p>We received a request to reset your password for your Schedule Maker account. Click the button below to reset your password:</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="{reset_url}" class="reset-button">Reset Password</a>
                    </div>
                    
                    <div class="message">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">{reset_url}</p>
                    </div>
                    
                    <div class="warning">
                        <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
                    </div>
                    
                    <div class="footer">
                        <p>If you're having trouble, please contact our support team.</p>
                        <p>&copy; 2025 Schedule Maker. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request - Schedule Maker
        
        We received a request to reset your password for your Schedule Maker account.
        
        Please click the following link to reset your password:
        {reset_url}
        
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        
        If you're having trouble, please contact our support team.

        © 2025 Schedule Maker. All rights reserved.
        """
        
        if not self.send_email(to_email, subject, html_body, is_html=True):
            return self.send_email(to_email, subject, text_body, is_html=False)
        
        return True

# Singleton instance
email_service = EmailService()
