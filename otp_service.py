import smtplib
import random
import time
import threading
from email.message import EmailMessage
from typing import Dict, Tuple

class OTPService:
    def __init__(self):
        self.otp_storage: Dict[str, Dict] = {}
        self.otp_expiry_seconds = 300
        
        # Working configuration from user script
        self.sender_email = "otakuaniverseofficial@gmail.com"
        self.app_password = "adxpxirxgwnrcjlo"
    
    def generate_otp(self) -> str:
        return str(random.randint(100000, 999999))
    
    def store_otp(self, email: str, otp: str) -> None:
        self.otp_storage[email.lower()] = {
            "otp": otp,
            "timestamp": time.time()
        }
    
    def verify_otp(self, email: str, otp: str) -> bool:
        email = email.lower()
        if email not in self.otp_storage:
            return False
        
        stored_data = self.otp_storage[email]
        if time.time() - stored_data["timestamp"] > self.otp_expiry_seconds:
            del self.otp_storage[email]
            return False
        
        if stored_data["otp"] == otp:
            del self.otp_storage[email]
            return True
        return False
    
    def send_otp_email(self, recipient_email: str, otp: str) -> bool:
        msg = EmailMessage()
        msg["Subject"] = "Your OTP Code - VIT-ChainVote"
        msg["From"] = self.sender_email
        msg["To"] = recipient_email
        msg.set_content(f"Your VIT-ChainVote OTP is: {otp}\n\nThis code will expire in 5 minutes.")

        try:
            # Using port 465 with SSL as requested by user
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=10.0) as server:
                server.login(self.sender_email, self.app_password)
                server.send_message(msg)
            print(f"✅ OTP SENT successfully to {recipient_email}")
            return True
        except Exception as e:
            print(f"❌ SMTP Error (Port 465 SSL): {str(e)}")
            return False
            
    def generate_and_send_otp(self, email: str) -> Tuple[bool, str]:
        otp = self.generate_otp()
        self.store_otp(email, otp)
        
        print(f"-----------------------------------------------")
        print(f"🔐 NEW OTP GENERATED: [ {otp} ] for {email}")
        print(f"-----------------------------------------------")
        
        # Send Synchronously (Blocking) to ensure delivery
        success = self.send_otp_email(email, otp)
        
        if success:
            return True, "OTP sent successfully"
        else:
            return False, "Failed to send email. Check server logs."
