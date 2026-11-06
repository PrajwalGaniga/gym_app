import re
from typing import Optional

def normalize_phone(phone: str, default_country_code: str = "+91") -> str:
    """
    Normalizes a phone number to standard E.164-like representation.
    Handles Indian phone formats (10 digits, with/without 0 or 91 or +91, spaces/dashes).
    """
    if not phone:
        return ""
    
    # Remove all whitespace, parentheses, and dashes
    cleaned = re.sub(r"[\s\-\(\)\.]", "", phone.strip())
    
    if not cleaned:
        return ""
    
    # If starts with +, check digits
    if cleaned.startswith("+"):
        digits = re.sub(r"\D", "", cleaned[1:])
        return f"+{digits}"
    
    # If default country code is +91 and 10 digits starting with 6, 7, 8, or 9
    digits_only = re.sub(r"\D", "", cleaned)
    
    if default_country_code == "+91":
        # 10 digits: 9876543210
        if len(digits_only) == 10:
            return f"+91{digits_only}"
        # 11 digits starting with 0: 09876543210
        elif len(digits_only) == 11 and digits_only.startswith("0"):
            return f"+91{digits_only[1:]}"
        # 12 digits starting with 91: 919876543210
        elif len(digits_only) == 12 and digits_only.startswith("91"):
            return f"+{digits_only}"
        else:
            return f"+{digits_only}"
            
    # Generic prefix
    code = default_country_code if default_country_code.startswith("+") else f"+{default_country_code}"
    return f"{code}{digits_only}"

def validate_phone(phone: str) -> bool:
    """Validates whether phone contains a plausible number of digits (min 7, max 15)."""
    digits = re.sub(r"\D", "", phone or "")
    return 7 <= len(digits) <= 15
