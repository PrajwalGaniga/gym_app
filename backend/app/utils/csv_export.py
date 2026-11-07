import csv
import io
from typing import List, Dict, Any

def sanitize_csv_value(val: Any) -> Any:
    """
    Prevents CSV / Spreadsheet Formula Injection (CSV Injection / CWE-1236).
    If a string value starts with =, +, -, @, tab, or carriage return,
    preface it with a single quote.
    """
    if val is None:
        return ""
    str_val = str(val)
    if str_val and str_val[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{str_val}"
    return str_val

def generate_csv_response(fieldnames: List[str], rows: List[Dict[str, Any]]) -> str:
    """Generates a sanitized CSV string from dictionaries."""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
    writer.writeheader()
    for row in rows:
        sanitized_row = {k: sanitize_csv_value(row.get(k, "")) for k in fieldnames}
        writer.writerow(sanitized_row)
    return output.getvalue()

