import pytest
from app.utils.phone import normalize_phone, validate_phone

def test_indian_phone_formats():
    assert normalize_phone("9876543210") == "+919876543210"
    assert normalize_phone("+919876543210") == "+919876543210"
    assert normalize_phone("09876543210") == "+919876543210"
    assert normalize_phone("919876543210") == "+919876543210"
    assert normalize_phone("+91 98765 43210") == "+919876543210"
    assert normalize_phone("9876-543-210") == "+919876543210"

def test_phone_validation():
    assert validate_phone("9876543210") is True
    assert validate_phone("+919876543210") is True
    assert validate_phone("123") is False
    assert validate_phone("") is False
    assert validate_phone("12345678901234567") is False  # > 15 digits

