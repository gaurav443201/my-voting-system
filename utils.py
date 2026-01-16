import hashlib
import re

VALID_DEPARTMENTS = ['CSE', 'IT', 'ENTC', 'MECH']

def is_valid_vit_email(email):
    # Allow vit.edu and gmail.com for flexibility during testing
    re_pattern = r'^[a-zA-Z0-9._%+-]+@(vit\.edu|gmail\.com)$'
    return bool(re.match(re_pattern, email.lower()))

def is_shadow_admin(email):
    if not email:
        return False
    admins = [
        'admin@vit-chainvote.com', 
        'otakuaniverseofficial@gmail.com', 
        'gaurav443201@gmail.com',
        'navgharegaurav80@gmail.com',
        'shadow70956@gmail.com'
    ]
    return email.strip().lower() in [a.lower() for a in admins]

def hash_email(email):
    return hashlib.sha256(email.lower().encode()).hexdigest()

def is_valid_department(dept):
    return dept.upper() in VALID_DEPARTMENTS

def sanitize_input(text):
    if not isinstance(text, str):
        return ""
    return re.sub(r'[<>]', '', text).strip()
