# Motor de Facturacion

Motor backend en TypeScript/Express para recibir documentos de facturacion desde API, archivos locales y webhooks de proveedores, normalizarlos, persistirlos en Postgres y generar XML DTE preliminar.

## Componentes

- API HTTP Express en `src/app.ts`.
- Persistencia Postgres con Sequelize.
- Worker de archivos para `input/pending`.
- Worker de jobs para webhooks de pago.
- Integracion inicial con proveedor Lava Ya.
- Administracion de CAF y secuencias de folio.
- Generacion de XML DTE preliminar en `output/xml`.
- Endpoints de auditoria para jobs y eventos webhook.

## Requisitos

- Node.js compatible con ES2022.
- Postgres disponible.
- Variables de entorno en `.env`.

Variables principales:

```env
PORT=4000
BILLING_API_KEY=change-me

DB_HOST=localhost
DB_PORT=5432
DB_NAME=billing
DB_USER=postgres
DB_PASSWORD=postgres

INPUT_PENDING_DIR=input/pending
INPUT_PROCESSING_DIR=input/processing
INPUT_PROCESSED_DIR=input/processed
INPUT_ERROR_DIR=input/error
OUTPUT_XML_DIR=output/xml
SIGN_PRIVATE_KEY_PATH=C:\opt\certs\private-key.pem
SIGN_CERTIFICATE_PATH=C:\opt\certs\certificate.pem

ISSUER_RUT=76999888-8
ISSUER_RAZON_SOCIAL=EMISOR DEMO SPA
ISSUER_GIRO=SERVICIOS
ISSUER_ACTECO=960909
ISSUER_DIRECCION=Av. Providencia 100
ISSUER_COMUNA=Providencia
ISSUER_CIUDAD=Santiago

LAVAYA_API_URL=http://localhost:4000/mock/lava-ya
LAVAYA_API_KEY=change-me
JOB_WORKER_INTERVAL_MS=5000
```

## Scripts

```powershell
npm install
npm run db:sync
npm run dev
npm run worker
npm run job-worker
npm run dev:all
npm run build
npm test
npm run test:integration
```

- `npm run dev`: levanta la API.
- `npm run worker`: observa archivos entrantes.
- `npm run job-worker`: procesa jobs pendientes de webhooks.
- `npm run dev:all`: levanta API, worker de archivos y worker de jobs.
- `npm run start`: ejecuta el build compilado desde `dist/app.js`.
- `npm test`: compila y ejecuta tests unitarios sin Postgres.
- `npm run test:integration`: compila y ejecuta pruebas contra Postgres.

## Autenticacion

Las rutas protegidas esperan `BILLING_API_KEY` en alguno de estos headers:

```http
x-api-key: change-me
Authorization: Bearer change-me
```

## Endpoints

### Salud

```http
GET /health
```

### Facturacion

Todas las rutas bajo `/api/billing` usan API key.

```http
POST /api/billing/invoice
GET /api/billing/documents
GET /api/billing/documents/:id
POST /api/billing/documents/:id/generate-xml
POST /api/billing/documents/:id/sign-xml
GET /api/billing/imports
GET /api/billing/imports/:id
POST /api/billing/imports/:id/retry
```

`GET /documents` y `GET /imports` soportan:

```txt
?limit=50&offset=0&status=validated
```

Ejemplo `POST /api/billing/invoice`:

```json
{
  "documentType": 33,
  "folio": 1001,
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

### Webhooks

```http
POST /api/webhooks/:provider/payment
```

Payload minimo:

```json
{
  "event_id": "evt-123",
  "payment_id": "pay-123",
  "event_type": "payment.paid"
}
```

El webhook registra el evento, evita duplicados por `provider + external_event_id` y crea un job `payment_invoice` cuando corresponde.

### CAF y Folios

Todas las rutas bajo `/api/cafs` usan API key.

```http
GET /api/cafs
POST /api/cafs
```

Ejemplo `POST /api/cafs`:

```json
{
  "document_type": 33,
  "folio_from": 1001,
  "folio_to": 2000,
  "caf_xml": "<AUTORIZACION>...</AUTORIZACION>",
  "private_key": "-----BEGIN PRIVATE KEY-----...",
  "public_key": "-----BEGIN PUBLIC KEY-----...",
  "authorization_date": "2026-06-19",
  "expires_at": "2027-06-19"
}
```

Al crear un CAF tambien se crea una secuencia en `billing_folio_sequences`. Cuando un documento llega sin `folio`, el motor toma el siguiente folio activo para el tipo de DTE y emisor configurado.

### Auditoria

Todas las rutas bajo `/api/audit` usan API key.

```http
GET /api/audit/jobs
GET /api/audit/jobs/:id
PATCH /api/audit/jobs/:id/retry
GET /api/audit/webhook-events
GET /api/audit/webhook-events/:id
```

Filtros soportados:

```txt
/api/audit/jobs?status=failed&provider=lava-ya
/api/audit/webhook-events?status=received&provider=lava-ya&event_type=payment.paid
```

### Mock Lava Ya

Rutas de apoyo local:

```http
GET /mock/lava-ya/payments/:id
GET /mock/lava-ya/orders/:id
```

## Flujo por Archivo

1. El worker observa `input/pending`.
2. Mueve el archivo a `input/processing`.
3. Parsea `.json` o `.txt`.
4. Valida RUT, receptor, items y montos.
5. Normaliza neto, IVA y total.
6. Persiste `billing_documents`, `billing_document_items` y `billing_file_imports`.
7. Si el payload no trae folio, asigna el siguiente folio desde el CAF activo.
8. Mueve el archivo a `input/processed` o `input/error`.

Formato TXT:

```txt
DOCUMENT_TYPE=33
FOLIO=1001
RECEIVER_RUT=76999888-8
RECEIVER_NAME=CLIENTE DEMO SPA
RECEIVER_GIRO=SERVICIOS
RECEIVER_ADDRESS=Av. Providencia 100
RECEIVER_COMUNA=Providencia
RECEIVER_CIUDAD=Santiago
ITEM=Servicio base|1|10000
ITEM=Servicio adicional|2|5000
```

## Flujo Webhook Lava Ya

1. El proveedor llama `POST /api/webhooks/lava-ya/payment`.
2. Se registra el evento en `billing_webhook_events`.
3. Se crea un job pendiente en `billing_jobs`.
4. `job-worker` consulta el pago y la orden en Lava Ya.
5. El mapper convierte la orden a `BillingDocumentInput`.
6. Se crea el documento con `sourceType=webhook`.
7. Se asigna folio si el documento no lo trae.
8. Se genera XML DTE preliminar.
9. El job queda `processed` o vuelve a `pending` hasta 3 intentos.

## Flujo CAF y XML

1. Se registra un CAF con `POST /api/cafs`.
2. El motor crea una secuencia activa para `document_type + issuer_rut + caf_id`.
3. `createBillingDocument` solicita folio cuando el documento no trae uno.
4. `assignNextFolio` bloquea la secuencia en transaccion e incrementa `current_folio`.
5. `POST /api/billing/documents/:id/generate-xml` genera el XML con datos del emisor, receptor, totales, detalle y TED cuando el documento tiene CAF asociado.
6. El documento queda con `status=xml_generated` y `xml_path`.
7. `POST /api/billing/documents/:id/sign-xml` firma el XML con `SIGN_PRIVATE_KEY_PATH` y `SIGN_CERTIFICATE_PATH`.
8. El documento queda con `status=signed` y `xml_path` apuntando al archivo firmado.

## Estados Relevantes

Documentos:

- `validated`
- `xml_generated`
- `signed`

Imports:

- `processing`
- `processed`
- `error`

Jobs:

- `pending`
- `processing`
- `processed`
- `failed`

## Pruebas

Unitarias:

```powershell
npm test
```

Cubre validacion, normalizacion, parser TXT, middleware de API key y mapper Lava Ya.
Tambien cubre configuracion de emisor, transiciones de jobs, parser CAF y validacion de configuracion de firma XML.

Integracion:

```powershell
npm run test:integration
```

Requiere Postgres configurado. Crea un TXT temporal, ejecuta `processBillingFile`, verifica documento, items e import, y limpia sus datos de prueba.

## Notas de Desarrollo

- `sequelize.sync({ alter: true })` esta pensado para desarrollo. Para produccion conviene migraciones versionadas.
- El TED ya tiene una primera implementacion con CAF asociado. Sin llave privada de CAF usa una firma demo.
- La firma XML espera llave privada y certificado en PEM. La conversion PFX a PEM queda fuera del motor por ahora.
- El envio SII aun no esta implementado.
- Los tests unitarios importan desde `dist`, por eso siempre ejecutan `npm run build` antes.
