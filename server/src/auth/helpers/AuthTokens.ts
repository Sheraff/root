/**
 *  Cryptography Functions
 *
 *  Forked from
 *  https://gist.github.com/AndiDittrich/4629e7db04819244e843
 */

import crypto, { type CipherGCMTypes } from "node:crypto"
import { type BaseSchema, type Output, parse } from "valibot"
import { env } from "~/env"

const ALGORITHM: CipherGCMTypes = "aes-256-gcm"
const PASSWORD = env.SESSION_COOKIE_SECRET

/**
 * Derive 256 bit encryption key from password, using salt and iterations -> 32 bytes
 * @param password
 * @param salt
 * @param iterations
 */
function deriveKeyFromPassword(salt: Buffer, iterations: number): Buffer {
	return crypto.pbkdf2Sync(PASSWORD, salt, iterations, 32, "sha512")
}

export function encrypt(data: object): string {
	const plainText = JSON.stringify(data)

	// Generate random salt -> 64 bytes
	const salt = crypto.randomBytes(64)

	// Generate random initialization vector -> 16 bytes
	const iv = crypto.randomBytes(16)

	// Generate random count of iterations between 10.000 - 99.999 -> 5 bytes
	const iterations = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000

	// Derive encryption key
	const encryptionKey = deriveKeyFromPassword(salt, Math.floor(iterations * 0.47 + 1337))

	// Create cipher
	const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv)

	// Update the cipher with data to be encrypted and close cipher
	const encryptedData = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()])

	// Get authTag from cipher for decryption // 16 bytes
	const authTag = cipher.getAuthTag()

	// Join all data into single string, include requirements for decryption
	const output = Buffer.concat([
		salt,
		iv,
		authTag,
		Buffer.from(iterations.toString()),
		encryptedData,
	]).toString("hex")

	return output
}

export function decrypt<Schema extends BaseSchema>(
	cipherText: string,
	schema: Schema,
): { success: Output<Schema> } | { error: Error } {
	try {
		const inputData = Buffer.from(cipherText, "hex")

		// Split cipherText into partials
		const salt = inputData.subarray(0, 64)
		const iv = inputData.subarray(64, 80)
		const authTag = inputData.subarray(80, 96)
		const iterations = parseInt(inputData.subarray(96, 101).toString("utf-8"), 10)
		const encryptedData = inputData.subarray(101)

		// Derive key
		const decryptionKey = deriveKeyFromPassword(salt, Math.floor(iterations * 0.47 + 1337))

		// Create decipher
		const decipher = crypto.createDecipheriv(ALGORITHM, decryptionKey, iv)
		decipher.setAuthTag(authTag)

		// Decrypt data
		// @ts-expect-error -- TS expects the wrong createDecipher return type here
		const decrypted = decipher.update(encryptedData, "binary", "utf-8") + decipher.final("utf-8")
		const unknown = JSON.parse(decrypted)
		const success = parse(schema, unknown)

		return { success }
	} catch (cause) {
		const error = new Error("Decryption failed", { cause })
		return { error }
	}
}
