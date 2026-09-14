import bwipjs from 'bwip-js'

type Pdf417RenderOptions = {
    bcid: 'pdf417'
    text: string
    binarytext: boolean
    eclevel: number
    columns: number
    scaleX: number
    scaleY: number
    includetext: boolean
    paddingwidth: number
    paddingheight: number
}

export async function generatePdf417Buffer(data: string): Promise<Buffer> {
    /*
     * El TED debe entrar completo.
     *
     * NO eliminamos nodos,
     * NO eliminamos CAF,
     * NO eliminamos FRMT.
     */

    const ted = data.trim()

    const bytes = Buffer.from(ted, 'latin1')

    /*
     * binarytext evita que bwip-js
     * convierta nuevamente el string
     * como UTF-8.
     *
     * El SII exige Byte Compaction
     * para el timbre electrónico.
     */

    const binaryText = bytes.toString('latin1')

    /*
     * bwip-js permite parámetros específicos
     * por tipo de código de barras.
     *
     * "eclevel" corresponde a PDF417, pero
     * actualmente no está declarado dentro
     * del tipo genérico RenderOptions de
     * bwip-js.
     *
     * Definimos el contrato utilizado por
     * nuestro PDF417 y conservamos exactamente
     * las mismas opciones de generación.
     */

    const options: Pdf417RenderOptions = {
        bcid: 'pdf417',

        text: binaryText,

        /*
         * Muy importante para este caso.
         */
        binarytext: true,

        /*
         * SII:
         * Error Correction Level 5.
         */
        eclevel: 5,

        /*
         * No fijamos rows.
         * Dejamos que PDF417 determine
         * las filas necesarias.
         */
        columns: 20,

        /*
         * Solo afectan representación,
         * no capacidad de datos.
         */
        scaleX: 2,

        scaleY: 6,

        includetext: false,

        paddingwidth: 10,

        paddingheight: 10,
    }

    /*
     * La versión instalada de bwip-js dispone
     * de la variante Promise de toBuffer().
     *
     * Sus definiciones TypeScript mezclan esa
     * sobrecarga con la variante callback y
     * pueden inferir:
     *
     * void & Promise<Buffer>
     *
     * Forzamos únicamente el tipo correcto de
     * retorno. No modificamos la ejecución ni
     * las opciones enviadas a bwip-js.
     */

    const buffer = await (bwipjs.toBuffer(
        options as Parameters<typeof bwipjs.toBuffer>[0],
    ) as unknown as Promise<Buffer>)

    return buffer
}