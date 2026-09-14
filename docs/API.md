# Referencia API

Base URL local: `http://localhost:4000`.

Salvo `GET /health` y las rutas `/mock/lava-ya`, todos los endpoints requieren
una API key mediante `x-api-key: <BILLING_API_KEY>` o
`Authorization: Bearer <BILLING_API_KEY>`. Los cuerpos JSON deben enviarse con
`Content-Type: application/json`.

Las respuestas JSON exitosas usan `ok: true` y normalmente entregan el recurso
en `data`. Los errores usan `ok: false` y `message`; la validacion de documentos
tambien incluye `errors`. Un API key ausente o incorrecto retorna `401`; si
`BILLING_API_KEY` no esta configurada, retorna `500`.

## Salud y mocks

| Metodo | Ruta | Auth | Descripcion |
| --- | --- | --- | --- |
| GET | `/health` | No | Estado del servicio. |
| GET | `/mock/lava-ya/payments/:id` | No | Pago simulado para desarrollo. |
| GET | `/mock/lava-ya/orders/:id` | No | Orden simulada para desarrollo. |

## Facturacion

| Metodo | Ruta | Entrada | Resultado principal |
| --- | --- | --- | --- |
| POST | `/api/billing/invoice` | Documento JSON | `201`, documento persistido. |
| GET | `/api/billing/documents` | `limit`, `offset`, `status` | Lista paginada. |
| GET | `/api/billing/documents/:id` | UUID | Documento con `items`; `404` si no existe. |
| POST | `/api/billing/documents/:id/generate-xml` | UUID | Ruta del XML y estado `xml_generated`. |
| POST | `/api/billing/documents/:id/sign-xml` | UUID | Ruta firmada y estado `signed`. |
| POST | `/api/billing/documents/:id/print` | UUID | Genera PDF y devuelve `filePath`. Requiere XML. |
| GET | `/api/billing/documents/:id/print/download` | UUID | Descarga el PDF; `404` si aun no fue generado. |
| POST | `/api/billing/documents/:id/thermal-ticket` | UUID | Genera archivo de texto y devuelve `filePath` y `ticket`. |
| GET | `/api/billing/imports` | `limit`, `offset`, `status` | Lista paginada de imports. |
| GET | `/api/billing/imports/:id` | UUID | Detalle de import; `404` si no existe. |
| POST | `/api/billing/imports/:id/retry` | UUID | `201`, documento reprocesado; `409` si falta el archivo. |
| GET | `/api/billing/certificate/test` | — | Metadatos del certificado PFX configurado. |

`limit` debe ser entero positivo, tiene valor por defecto 50 y se limita a 200.
`offset` debe ser entero no negativo y por defecto es 0. Valores invalidos se
reemplazan por esos defaults.

### Crear factura

```json
{
  "documentType": 33,
  "receiver": {
    "rut": "76999888-8",
    "razonSocial": "CLIENTE DEMO SPA",
    "giro": "SERVICIOS",
    "address": "Av. Providencia 100",
    "comuna": "Providencia",
    "ciudad": "Santiago"
  },
  "items": [
    {
      "description": "Servicio base",
      "quantity": 1,
      "unitPrice": 10000
    }
  ]
}
```

`documentType`, `receiver.rut`, `receiver.razonSocial` e `items` son
obligatorios. Cada item requiere `description`, `quantity` mayor que cero y
`unitPrice` no negativo. `folio` es opcional; si se omite, se obtiene desde un
CAF activo. El servidor calcula neto, IVA y total.

## CAF y folios

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| GET | `/api/cafs` | Lista CAF, incluyendo `folio_sequences`. |
| POST | `/api/cafs` | Registra un CAF y crea su secuencia; retorna `201`. |

Campos obligatorios: `document_type`, `folio_from`, `folio_to` y `caf_xml`.
Campos opcionales: `private_key`, `public_key`, `authorization_date` y
`expires_at`. El emisor se toma de las variables `ISSUER_*`.

## Webhooks

`POST /api/webhooks/:provider/payment` acepta distintas convenciones del
proveedor:

- ID de evento: `event_id`, `id`, `eventId` o `uuid` (obligatorio).
- ID de pago: `payment_id`, `paymentId`, `transaction_id`, `transactionId`,
  `sale_id` o `saleId`.
- Tipo: `event_type`, `type` o `event`; por defecto `payment.received`.

Un evento nuevo retorna `201` y crea un job `payment_invoice`. La misma
combinacion `provider + external_event_id` retorna `200`, `duplicated: true` y
no crea otro job.

## Auditoria

| Metodo | Ruta | Filtros/entrada |
| --- | --- | --- |
| GET | `/api/audit/jobs` | `status`, `provider`. |
| GET | `/api/audit/jobs/:id` | UUID. |
| PATCH | `/api/audit/jobs/:id/retry` | Solo jobs en estado `failed`. |
| GET | `/api/audit/webhook-events` | `status`, `provider`, `event_type`. |
| GET | `/api/audit/webhook-events/:id` | UUID. |

Estas listas no implementan paginacion actualmente.

## Submissions SII

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| POST | `/api/sii/submissions` | Crea una submission desde documentos firmados; `201`. |
| GET | `/api/sii/submissions` | Lista submissions. |
| GET | `/api/sii/submissions/:id` | Submission con documentos asociados. |
| GET | `/api/sii/submissions/:id/status` | Vista resumida del estado. |
| POST | `/api/sii/submissions/:id/generate-envelope` | Genera EnvioDTE. |
| POST | `/api/sii/submissions/:id/sign-envelope` | Firma EnvioDTE. |
| POST | `/api/sii/submissions/:id/send` | Envia y guarda `track_id`. |
| POST | `/api/sii/submissions/:id/check-status` | Consulta SII y actualiza estado. |

Cuerpo de creacion:

```json
{
  "documentIds": ["uuid-documento-firmado"]
}
```

`documentIds` debe ser un arreglo no vacio de documentos existentes con estado
`signed`. Estados posibles: `created`, `envelope_generated`,
`envelope_signed`, `sent`, `accepted`, `rejected`, `processing` y `error`.
El modo `mock` permite recorrer todo el flujo; el modo real aun responde que la
integracion SII no esta configurada.

## Secuencia recomendada

1. Crear o cargar un CAF del tipo de documento.
2. Crear la factura y conservar `data.id`.
3. Generar y firmar su XML.
4. Crear la submission con el ID del documento.
5. Generar y firmar el envelope.
6. Enviar y consultar el estado.

Las rutas que generan archivos devuelven rutas locales del servidor, no el
contenido del archivo. Solo `/print/download` entrega el binario PDF.
