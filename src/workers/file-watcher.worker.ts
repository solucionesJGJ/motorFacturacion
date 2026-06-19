import 'dotenv/config'
import chokidar from 'chokidar'
import path from 'path'
import fs from 'fs/promises'
import { processBillingFile } from '../services/billing-import.service.js'

const pendingDir = path.resolve(process.env.INPUT_PENDING_DIR || 'input/pending')
const processingDir = path.resolve(
    process.env.INPUT_PROCESSING_DIR || 'input/processing',
)
const processedDir = path.resolve(
    process.env.INPUT_PROCESSED_DIR || 'input/processed',
)
const errorDir = path.resolve(process.env.INPUT_ERROR_DIR || 'input/error')

async function ensureDirectories() {
    await fs.mkdir(pendingDir, { recursive: true })
    await fs.mkdir(processingDir, { recursive: true })
    await fs.mkdir(processedDir, { recursive: true })
    await fs.mkdir(errorDir, { recursive: true })
}

async function moveFile(from: string, toDir: string) {
    const filename = path.basename(from)
    const target = path.join(toDir, filename)

    await fs.rename(from, target)

    return target
}

async function handleFile(filePath: string) {
    let processingPath = ''

    try {
        processingPath = await moveFile(filePath, processingDir)

        const document = await processBillingFile(processingPath)

        console.log('Documento procesado:', document)

        await moveFile(processingPath, processedDir)
    } catch (error) {
        console.error('Error procesando archivo:', error)

        if (processingPath) {
            await moveFile(processingPath, errorDir)
        }
    }
}

async function main() {
    await ensureDirectories()

    console.log('Worker escuchando carpeta:', pendingDir)

    const watcher = chokidar.watch(pendingDir, {
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 1500,
            pollInterval: 100,
        },
    })

    watcher.on('add', handleFile)
}

main()