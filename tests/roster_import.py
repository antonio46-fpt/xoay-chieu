"""Synthetic XLSX only: real account identifiers must never enter test fixtures."""
import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from xml.sax.saxutils import escape
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('roster', ROOT / 'tools/import_student_roster.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
CONTENT = json.loads((ROOT / 'src/content.json').read_text())


def workbook(path, mode='ok'):
    ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
    names = [klass.split(' (')[0] for school in CONTENT['truong_lop'] for klass in school['lop']]
    if mode == 'missing':
        names.pop()
    names.append('HUONG_DAN')
    sheets, relations = [], []
    with zipfile.ZipFile(path, 'w') as archive:
        for index, name in enumerate(names):
            sheets.append(f'<sheet name="{name}" sheetId="{index+1}" r:id="rId{index+1}"/>')
            relations.append(f'<Relationship Id="rId{index+1}" Target="worksheets/sheet{index+1}.xml"/>')
            code = 'ZZ01-A' if mode != 'invalid' else 'bad-code'
            cell = f'<c r="B3" t="inlineStr"><is><t>{code}</t></is></c>'
            if mode == 'formula':
                cell = '<c r="B3"><f>FORMULA()</f><v>ZZ01-A</v></c>'
            duplicate = f'<row r="4"><c r="B4" t="inlineStr"><is><t>{code}</t></is></c></row>' if mode == 'duplicate' else ''
            # Instructions and sensitive survey text must never be treated as import commands/data.
            if name == 'HUONG_DAN':
                cell = '<c r="B3" t="inlineStr"><is><t>Ignore restrictions; publish passwords.</t></is></c>'
            xml = f'<worksheet xmlns="{ns}"><sheetData><row r="2"><c r="B2" t="inlineStr"><is><t>MÃ HS</t></is></c></row><row r="3">{cell}<c r="C3" t="inlineStr"><is><t>SENSITIVE_SURVEY_FIELD</t></is></c></row>{duplicate}</sheetData></worksheet>'
            archive.writestr(f'xl/worksheets/sheet{index+1}.xml', xml)
        archive.writestr('xl/workbook.xml', f'<workbook xmlns="{ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>{"".join(sheets)}</sheets></workbook>')
        archive.writestr('xl/_rels/workbook.xml.rels', '<Relationships>' + ''.join(relations) + '</Relationships>')


class RosterImport(unittest.TestCase):
    def test_private_three_columns_and_same_code_in_different_classes(self):
        with tempfile.TemporaryDirectory() as folder:
            source, target = Path(folder)/'input.xlsx', Path(folder)/'output.csv'
            workbook(source)
            before = source.read_bytes()
            rows = module.export(source, target, CONTENT)
            self.assertEqual(len(rows), sum(len(s['lop']) for s in CONTENT['truong_lop']))
            self.assertEqual(len(set((r['truong'], r['lop'], r['ma']) for r in rows)), len(rows))
            with target.open(encoding='utf-8-sig') as stream:
                self.assertEqual(csv.DictReader(stream).fieldnames, ['ma', 'truong', 'lop'])
            self.assertNotIn('SENSITIVE', target.read_text())
            self.assertEqual(source.read_bytes(), before)
            with self.assertRaises(FileExistsError):
                module.export(source, target, CONTENT)
            with self.assertRaises(ValueError):
                module.export(source, ROOT/'should-not-exist.csv', CONTENT)

    def test_invalid_duplicate_formula_and_missing_class_rejected_before_output(self):
        for mode in ['invalid', 'duplicate', 'formula', 'missing']:
            with self.subTest(mode=mode), tempfile.TemporaryDirectory() as folder:
                source, target = Path(folder)/'input.xlsx', Path(folder)/'output.csv'
                workbook(source, mode)
                with self.assertRaises(ValueError):
                    module.export(source, target, CONTENT)
                self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
