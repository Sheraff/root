export interface SqliteError extends Error {
	name: string
	message: string
	code: string
}
