from pathlib import Path
from lxml import etree
import sys

BASE = Path(__file__).resolve().parent.parent

XSD_PATH = (
    BASE
    / "schemas"
    / "sii"
    / "EnvioDTE_v10.xsd"
)

XML_PATH = (
    BASE
    / "output"
    / "envios"
    / "envio-sii-5044390-1-test-signed.xml"
)

print()
print("SII 5044390-1 - VALIDACION ENVIO DTE XSD")
print("────────────────────────────────")
print(f"XSD: {XSD_PATH}")
print(f"XML: {XML_PATH}")
print()

if not XSD_PATH.exists():
    print("✘ No existe EnvioDTE_v10.xsd")
    sys.exit(1)

if not XML_PATH.exists():
    print("✘ No existe el EnvioDTE firmado")
    sys.exit(1)

try:
    parser = etree.XMLParser(
        encoding="ISO-8859-1",
        remove_blank_text=False,
    )

    schema_doc = etree.parse(
        str(XSD_PATH),
        parser,
    )

    schema = etree.XMLSchema(
        schema_doc,
    )

    xml_doc = etree.parse(
        str(XML_PATH),
        parser,
    )

    valid = schema.validate(
        xml_doc,
    )

    print(
        f"Resultado XSD: {valid}",
    )

    print()

    if valid:
        print(
            "✔ EnvioDTE válido contra EnvioDTE_v10.xsd",
        )

        sys.exit(0)

    print(
        "ERRORES XSD",
    )

    print(
        "────────────────────────────────",
    )

    for error in schema.error_log:
        print(
            f"Línea {error.line}, "
            f"columna {error.column}: "
            f"{error.message}"
        )

    sys.exit(1)

except etree.XMLSyntaxError as exc:
    print(
        "✘ XML mal formado",
    )

    print(exc)

    sys.exit(1)

except etree.XMLSchemaParseError as exc:
    print(
        "✘ Error cargando schema",
    )

    print(exc)

    sys.exit(1)

except Exception as exc:
    print(
        "✘ Error inesperado",
    )

    print(exc)

    sys.exit(1)