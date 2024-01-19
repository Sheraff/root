import { brotliCompress, constants } from "node:zlib"

export function compressBuffer(
	buffer: Buffer | ArrayBuffer,
	quality: number = constants.BROTLI_MAX_QUALITY,
) {
	return new Promise<Buffer>((resolve, reject) => {
		brotliCompress(
			buffer,
			{
				params: {
					[constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
					[constants.BROTLI_PARAM_QUALITY]: quality,
					[constants.BROTLI_PARAM_SIZE_HINT]: buffer.byteLength,
				},
			},
			(error, result) => {
				if (error) {
					reject(error)
				} else {
					resolve(result)
				}
			},
		)
	})
}
