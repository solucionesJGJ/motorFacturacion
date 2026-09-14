from pathlib import Path
from lxml import etree
import sys

BASE = Path(__file__).resolve().parent.parent

XSD_PATH = BASE / "schemas" / "sii" / "DTE_v10.xsd"
XML_PATH = BASE / "output" / "xml" / "dte-33-4-signed.xml"

print()
print("SII 5044390-1 - VALIDACION XSD")
print("────────────────────────────────")
print(f"XSD: {XSD_PATH}")
print(f"XML: {XML_PATH}")
print()

if not XSD_PATH.exists():
    print("✘ No existe DTE_v10.xsd")
    sys.exit(1)

if not XML_PATH.exists():
    print("✘ No existe el DTE firmado")
    sys.exit(1)

try:
    schema_doc = etree.parse(str(XSD_PATH))
    schema = etree.XMLSchema(schema_doc)

    xml_doc = etree.parse(str(XML_PATH))

    valid = schema.validate(xml_doc)

    print(f"Resultado XSD: {valid}")
    print()

    if valid:
        print("✔ DTE válido contra DTE_v10.xsd")
        sys.exit(0)

    print("ERRORES XSD")
    print("────────────────────────────────")

    for error in schema.error_log:
        print(
            f"Línea {error.line}, "
            f"columna {error.column}: "
            f"{error.message}"
        )

    sys.exit(1)

except etree.XMLSyntaxError as exc:
    print("✘ XML mal formado")
    print(exc)
    sys.exit(1)

except etree.XMLSchemaParseError as exc:
    print("✘ Error cargando schema")
    print(exc)
    sys.exit(1)

except Exception as exc:
    print("✘ Error inesperado")
    print(exc)
    sys.exit(1)