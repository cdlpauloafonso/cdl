#!/usr/bin/env python3
"""
Extrai associados da planilha AGENDA CDL (colunas A–F na sheet1) para associados-import.json.

Regras (alinhadas ao cadastro do admin):
- nome = nome da empresa (coluna B)
- telefone vazio → 11 zeros, formatado (00) 00000-0000
- 8 ou 9 dígitos locais → DDD 75 (Paulo Afonso)
- cidade Paulo Afonso, estado BA
- CNPJ: número da coluna C preenchido com zeros à esquerda até 14 dígitos (planilha pode truncar zeros)

Uso:
  python3 scripts/extract-associados-from-xlsx.py "/caminho/AGENDA CDL 2026 -.xlsx"
Saída: scripts/associados-import.json (sobrescreve)
"""
from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}


def col_letters(ref: str) -> str:
    return "".join(c for c in ref if c.isalpha())


def load_strings(z: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall(".//m:si", NS):
        parts: list[str] = []
        for t in si.findall(".//m:t", NS):
            if t.text:
                parts.append(t.text)
        strings.append("".join(parts))
    return strings


def parse_sheet(z: zipfile.ZipFile, name: str, strings: list[str]) -> dict[int, dict[str, object]]:
    data = z.read(f"xl/worksheets/{name}")
    root = ET.fromstring(data)
    rows: dict[int, dict[str, object]] = {}
    for row in root.findall(".//m:sheetData/m:row", NS):
        r = int(row.get("r"))
        rows[r] = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r")
            col = col_letters(ref or "")
            t = c.get("t")
            v = c.find("m:v", NS)
            val = v.text if v is not None and v.text else None
            if t == "s" and val is not None:
                val = strings[int(val)]
            elif val is not None and t != "s":
                try:
                    val = float(val)
                    if val == int(val):
                        val = int(val)
                except ValueError:
                    pass
            rows[r][col] = val
    return rows


def fmt_cnpj(c: object) -> str:
    if c is None or c == "":
        return "00.000.000/0000-00"
    try:
        n = int(float(c))  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return "00.000.000/0000-00"
    s = str(abs(n))
    if len(s) > 14:
        s = s[-14:]
    else:
        s = s.zfill(14)
    return f"{s[:2]}.{s[2:5]}.{s[5:8]}/{s[8:12]}-{s[12:14]}"


def digits_only_phone(f: object) -> str | None:
    if f is None or f == "":
        return None
    if isinstance(f, (int, float)):
        s = str(int(f))
    else:
        s = re.sub(r"\D", "", str(f))
    return s if s else None


def normalize_phone_digits(f: object) -> str:
    s = digits_only_phone(f)
    if not s:
        return "00000000000"
    if len(s) == 8:
        return "75" + s
    if len(s) == 9:
        return "75" + s
    if len(s) == 10:
        return s
    if len(s) == 11:
        return s
    if len(s) < 8:
        return "00000000000"
    return s[:11]


def mask_phone_br(digits: str) -> str:
    d = re.sub(r"\D", "", digits)
    if len(d) <= 2:
        return f"({d}"
    if len(d) <= 6:
        return f"({d[:2]}) {d[2:]}"
    if len(d) <= 10:
        return f"({d[:2]}) {d[2:6]}-{d[6:10]}"
    return f"({d[:2]}) {d[2:7]}-{d[7:11]}"


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: python3 extract-associados-from-xlsx.py <arquivo.xlsx>", file=sys.stderr)
        sys.exit(1)
    xlsx = Path(sys.argv[1])
    if not xlsx.is_file():
        print(f"Arquivo não encontrado: {xlsx}", file=sys.stderr)
        sys.exit(1)

    out_path = Path(__file__).resolve().parent / "associados-import.json"

    with zipfile.ZipFile(xlsx, "r") as z:
        strings = load_strings(z)
        rows = parse_sheet(z, "sheet1.xml", strings)

    out: list[dict] = []
    for r in sorted(rows.keys()):
        if r == 1:
            continue
        row = rows[r]
        emp = row.get("B")
        if emp is None:
            continue
        emp = str(emp).strip()
        if not emp or "LISTA DE EMPRESAS" in emp.upper():
            continue
        email_slug = re.sub(r"[^a-z0-9]+", "-", emp.lower())[:40].strip("-") or f"linha-{r}"
        out.append(
            {
                "nome": emp,
                "empresa": emp,
                "cnpj": fmt_cnpj(row.get("C")),
                "telefone": mask_phone_br(normalize_phone_digits(row.get("F"))),
                "email": f"{email_slug}-{r}@importacao.cdl.local",
                "cep": "",
                "endereco": str(row.get("E") or "").strip() or "—",
                "cidade": "Paulo Afonso",
                "estado": "BA",
                "plano": str(row.get("D") or "").strip(),
                "codigo_spc": "",
                "aniversariantes": [],
                "observacoes": "Importado da planilha AGENDA CDL 2026.",
            }
        )

    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Gravado {len(out)} registros em {out_path}")


if __name__ == "__main__":
    main()
