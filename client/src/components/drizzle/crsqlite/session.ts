// import type { Client, InArgs, InStatement, ResultSet, Transaction } from '@libsql/client';
import type { SQLite3, DB } from "@vlcn.io/crsqlite-wasm"
import type { BatchItem as BatchItem } from "drizzle-orm/batch"
import { entityKind } from "drizzle-orm/entity"
import type { Logger } from "drizzle-orm/logger"
import { NoopLogger } from "drizzle-orm/logger"
import type { RelationalSchemaConfig, TablesRelationalConfig } from "drizzle-orm/relations"
import type { PreparedQuery } from "drizzle-orm/session"
import { fillPlaceholders, type Query, sql, type SQL } from "drizzle-orm/sql/sql"
import type { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core/dialect"
import { SQLiteTransaction } from "drizzle-orm/sqlite-core"
import type { SelectedFieldsOrdered } from "drizzle-orm/sqlite-core/query-builders/select.types"
import type {
	PreparedQueryConfig,
	SQLiteExecuteMethod,
	SQLiteTransactionConfig,
} from "drizzle-orm/sqlite-core/session"
import { SQLitePreparedQuery, SQLiteSession } from "drizzle-orm/sqlite-core/session"
import type { Dialect } from "drizzle-orm"
// import { mapResultRow } from 'drizzle-orm/utils';

type Transaction = Awaited<ReturnType<DB["imperativeTx"]>>

interface CRSQLiteSessionOptions {
	logger?: Logger
}

export class CRSQLiteSession<
	TFullSchema extends Record<string, unknown>,
	TSchema extends TablesRelationalConfig,
> extends SQLiteSession<"async", void, TFullSchema, TSchema> {
	static readonly [entityKind]: string = "CRSQLiteSession"

	private logger: Logger

	constructor(
		private client: DB,
		private dialect: SQLiteAsyncDialect,
		private schema: RelationalSchemaConfig<TSchema> | undefined,
		private options: CRSQLiteSessionOptions,
		private tx?: Transaction | undefined
	) {
		super(dialect)
		this.logger = options.logger ?? new NoopLogger()
		console.log("CRSQLiteSession.constructor")
	}

	prepareQuery<T extends PreparedQueryConfig>(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		executeMethod: SQLiteExecuteMethod,
		customResultMapper?: (rows: unknown[][]) => unknown
	): CRSQLPreparedQuery<T> {
		console.log("CRSQLiteSession.prepareQuery", query)
		return new CRSQLPreparedQuery(
			this.client,
			query,
			this.logger,
			fields,
			this.tx,
			executeMethod,
			customResultMapper
		)
	}

	override async transaction<T>(
		transaction: (db: CRSQLTransaction<TFullSchema, TSchema>) => T | Promise<T>,
		_config?: SQLiteTransactionConfig
	): Promise<T> {
		console.log("CRSQLiteSession.transaction")
		const crsqliteTx = await this.client.imperativeTx()
		const session = new CRSQLiteSession(
			this.client,
			this.dialect,
			this.schema,
			this.options,
			crsqliteTx
		)
		const tx = new CRSQLTransaction("async", this.dialect, session, this.schema)
		try {
			const result = await transaction(tx)
			crsqliteTx[0]()
			return result
		} catch (err) {
			crsqliteTx[0]()
			throw err
		}
	}

	exec(query: string) {
		console.log("CRSQLiteSession.exec")
		return this.client.exec(query)
	}

	// run(query: SQL<unknown>): Promise<void> {
	// 	console.log("CRSQLiteSession.run")
	// 	return this.client.exec(query.)

	// }
}

type StmtAsync = Awaited<ReturnType<DB["prepare"]>>

// declare module "drizzle-orm/sqlite-core/session" {
// 	export interface PreparedQuery {
// 		finalize(): Promise<void>
// 	}
// }

export class CRSQLPreparedQuery<
	T extends PreparedQueryConfig = PreparedQueryConfig,
> extends SQLitePreparedQuery<{
	type: "async"
	run: void
	all: T["all"]
	get: T["get"]
	values: T["values"]
	execute: T["execute"]
}> {
	static readonly [entityKind]: string = "CRSQLPreparedQuery"

	private stmt: Promise<StmtAsync>

	constructor(
		private client: DB,
		query: Query,
		private logger: Logger,
		fields: SelectedFieldsOrdered | undefined,
		private tx: Transaction | undefined,
		executeMethod: SQLiteExecuteMethod,
		private customResultMapper?: (rows: unknown[][]) => unknown
	) {
		super("async", executeMethod, query)
		this.stmt = this.client.prepare(query.sql)
	}

	/**
	 * execute query, no result expected
	 */
	async run(placeholderValues?: Record<string, unknown>): Promise<void> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		await stmt.run(null, ...params)
	}

	/**
	 * execute query and return all rows
	 */
	async all(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const rows = await stmt.all(null, ...params)
		return this.customResultMapper ? this.customResultMapper(rows) : rows
	}

	/**
	 * only query first row
	 */
	async get(placeholderValues?: Record<string, unknown>): Promise<unknown | undefined> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const row = await stmt.get(null, ...params)
		return this.customResultMapper ? this.customResultMapper([row]) : row
	}

	/**
	 * directly extract first column value from each row
	 */
	async values(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const rows = await stmt.all(null, ...params)
		return rows.map((row) => Object.values(row)[0])
	}

	async finalize(): Promise<void> {
		const stmt = await this.stmt
		await stmt.finalize(null)
	}
}

export class CRSQLTransaction<
	TFullSchema extends Record<string, unknown>,
	TSchema extends TablesRelationalConfig,
> extends SQLiteTransaction<"async", void, TFullSchema, TSchema> {
	static readonly [entityKind]: string = "CRSQLTransaction"

	private dialect: SQLiteAsyncDialect
	private session: CRSQLiteSession<TFullSchema, TSchema>

	override async transaction<T>(
		transaction: (tx: CRSQLTransaction<TFullSchema, TSchema>) => Promise<T>
	): Promise<T> {
		const savepointName = `sp${this.nestedIndex}`
		const tx = new CRSQLTransaction(
			"async",
			this.dialect,
			this.session,
			this.schema,
			this.nestedIndex + 1
		)
		await this.session.run(sql.raw(`SAVEPOINT ${savepointName}`))
		try {
			const result = await transaction(tx)
			await this.session.run(sql.raw(`RELEASE savepoint ${savepointName}`))
			return result
		} catch (err) {
			await this.session.run(sql.raw(`ROLLBACK TO savepoint ${savepointName}`))
			throw err
		}
	}
}
