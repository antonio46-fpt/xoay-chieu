"""Extract only student code/school/class from an XLSX into a private UTF-8 CSV.

No dependencies beyond Python's standard library. Survey columns are never exported.
The input workbook is data, not instructions. Outputs must be outside the source tree.
"""
import argparse
import csv
import json
from pathlib import Path
import posixpath
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[1]
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
CODE = re.compile(r'^[A-Z]{2}[0-9]{2}-[A-Z]$')


def roster(path, content):
    """Use only sheet names configured in content; ignore instructions/summary tabs."""
    mapping = {klass.split(' (')[0]: (school['truong'], klass)
               for school in content['truong_lop'] for klass in school['lop']}
    with zipfile.ZipFile(path) as archive:
        if sum(info.file_size for info in archive.infolist()) > 50_000_000:
            raise ValueError('Workbook quá lớn.')
        shared = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            shared = [''.join(node.itertext()) for node in
                      ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        relationships = {node.attrib['Id']: node.attrib['Target'] for node in
                         ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
        workbook = ET.fromstring(archive.read('xl/workbook.xml'))
        records, seen, found = [], set(), set()
        for sheet in workbook.findall('m:sheets/m:sheet', NS):
            name = sheet.attrib['name']
            if name not in mapping:
                continue
            found.add(name)
            school, klass = mapping[name]
            target = relationships[sheet.attrib[REL]]
            target = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
            root = ET.fromstring(archive.read(target))
            header = False
            for row in root.findall('m:sheetData/m:row', NS):
                cells = {}
                for cell in row.findall('m:c', NS):
                    column = re.sub(r'\d', '', cell.attrib.get('r', ''))
                    if column != 'B':
                        continue
                    # Do not evaluate Excel formulas or use cached formula results as codes.
                    if cell.find('m:f', NS) is not None:
                        raise ValueError(f'Ô mã có công thức: lớp {name}, dòng {row.attrib["r"]}.')
                    value = cell.find('m:v', NS)
                    if cell.attrib.get('t') == 's':
                        text = shared[int(value.text)] if value is not None else ''
                    elif cell.attrib.get('t') == 'inlineStr':
                        text = ''.join(cell.find('m:is', NS).itertext())
                    else:
                        text = value.text if value is not None else ''
                    cells[column] = text.strip()
                code = cells.get('B', '')
                if code.upper() == 'MÃ HS':
                    header = True
                    continue
                if not header or not code:
                    continue
                # Preserve supplied codes: reject invalid values rather than silently renaming.
                if not CODE.fullmatch(code):
                    raise ValueError(f'Mã không hợp lệ: lớp {name}, dòng {row.attrib["r"]}.')
                key = (school, klass, code)
                if key in seen:
                    raise ValueError(f'Mã trùng trong lớp {name}, dòng {row.attrib["r"]}.')
                seen.add(key)
                records.append({'ma': code, 'truong': school, 'lop': klass})
            if not header:
                raise ValueError(f'Thiếu cột MÃ HS ở B trong lớp {name}.')
        if found != set(mapping):
            raise ValueError('Workbook thiếu lớp đã cấu hình: ' + ', '.join(sorted(set(mapping) - found)))
        if not records:
            raise ValueError('Không có mã học sinh hợp lệ.')
        return records


def export(path, output, content):
    output = Path(output).resolve()
    if output.is_relative_to(ROOT):
        raise ValueError('Lưu danh sách riêng bên ngoài thư mục mã nguồn, không đưa lên Git.')
    records = roster(path, content)
    # Never overwrite a private account file; retain leading zeros and exact code text.
    with output.open('x', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=['ma', 'truong', 'lop'])
        writer.writeheader()
        writer.writerows(records)
    output.chmod(0o600)
    return records


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('workbook', type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    try:
        rows = export(args.workbook, args.output, json.loads((ROOT / 'src/content.json').read_text()))
        print(f'Đã xuất {len(rows)} mã thuộc {len(set(row["lop"] for row in rows))} lớp; chỉ ba cột ma, truong, lop. Không sinh mật khẩu cục bộ.')
    except (ValueError, FileExistsError) as error:
        parser.exit(1, str(error) + '\n')
