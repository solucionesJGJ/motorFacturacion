import bwipjs from 'bwip-js'

export async function generatePdf417Buffer(data: string) {
    return bwipjs.toBuffer({
        bcid: 'pdf417',
        text: data,
        scale: 2,
        height: 12,
        includetext: false,
    })
}