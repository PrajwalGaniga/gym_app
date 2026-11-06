import pytest
from app.utils.csv_export import sanitize_csv_value, generate_csv_response

def test_csv_formula_injection_prevention():
    # Dangerous formula characters: =, +, -, @, \t, \r
    assert sanitize_csv_value("=1+1") == "'=1+1"
    assert sanitize_csv_value("+2+2") == "'+2+2"
    assert sanitize_csv_value("-cmd|' /C calc'!A0") == "'-cmd|' /C calc'!A0"
    assert sanitize_csv_value("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_value("\tTAB_ATTACK") == "'\tTAB_ATTACK"
    assert sanitize_csv_value("Normal Text") == "Normal Text"
    assert sanitize_csv_value(1234) == "1234"
    assert sanitize_csv_value(None) == ""

def test_generate_csv_response():
    fields = ["name", "code"]
    rows = [
        {"name": "Regular Member", "code": "GYM001"},
        {"name": "=cmd|'calc'!A0", "code": "@HACK"}
    ]
    csv_str = generate_csv_response(fields, rows)
    assert "Regular Member,GYM001" in csv_str
    assert "'=cmd|'calc'!A0,'@HACK" in csv_str
