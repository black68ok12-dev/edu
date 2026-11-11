"""Refresh the browser dataset from the source workbook (openpyxl required)."""
from pathlib import Path
import json
import re
from datetime import datetime
from openpyxl import load_workbook

HERE = Path(__file__).resolve().parent
SOURCE = HERE.parent / '프로그램별_재원_2026_2027.xlsx'

def amount(value):
    if isinstance(value, (int, float)):
        return value
    text = str(value).strip().replace(',', '')
    sign = -1 if text.startswith(('△', '-')) else 1
    text = text.lstrip('△-').strip()
    if '조' in text:
        a, b = text.split('조', 1)
        return sign * (int(a) * 10000 + int(b.strip() or 0))
    if not re.fullmatch(r'\d+', text):
        raise ValueError(f'Invalid amount: {value}')
    return sign * int(text)

def main():
    sheet = load_workbook(SOURCE, read_only=True, data_only=False)['프로그램별 재원']
    records = []
    for i, row in enumerate(sheet.iter_rows(min_row=7, values_only=True), 7):
        if not row[0]:
            continue
        sector, account, group, program, a, b = row[:6]
        a, b = amount(a), amount(b)
        records.append(dict(id=i, sector=sector, account=account, group=group or program,
                            program=program, a=a, b=b, delta=b-a,
                            rate=(b-a)/a if a else None))
    payload = dict(source=SOURCE.name, sheet=sheet.title,
                   updated=datetime.now().strftime('%Y-%m-%d %H:%M'), unit='억 원', records=records)
    (HERE / 'data.js').write_text('window.BUDGET_DATA = '+json.dumps(payload, ensure_ascii=False, indent=2)+';\n', encoding='utf-8')
    print(json.dumps({'rows': len(records), '2026': sum(r['a'] for r in records), '2027': sum(r['b'] for r in records)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
