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
		private tx?: Transaction[1] | undefined
	) {
		super(dialect)
		this.logger = options.logger ?? new NoopLogger()
		console.log("CRSQLiteSession.constructor")
	}

	prepareQuery<T extends PreparedQueryConfig>(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		executeMethod: SQLiteExecuteMethod,
		_isResponseInArrayMode: boolean,
		customResultMapper?: (rows: unknown[][]) => unknown
	): CRSQLPreparedQuery<T> {
		console.log("CRSQLiteSession.prepareQuery", executeMethod, query)
		return new CRSQLPreparedQuery(
			this.client,
			query,
			false,
			this.logger,
			fields,
			this.tx ?? null,
			executeMethod,
			customResultMapper
		)
	}

	prepareOneTimeQuery(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		executeMethod: SQLiteExecuteMethod,
		_isResponseInArrayMode: boolean
	): SQLitePreparedQuery<PreparedQueryConfig & { type: "async" }> {
		console.log("CRSQLiteSession.prepareOneTimeQuery", executeMethod, query)
		return new CRSQLPreparedQuery(
			this.client,
			query,
			true,
			this.logger,
			fields,
			this.tx ?? null,
			executeMethod
		)
	}

	override async transaction<T>(
		transaction: (db: CRSQLTransaction<TFullSchema, TSchema>) => Promise<T>
		// _config?: SQLiteTransactionConfig
	): Promise<T> {
		console.log("CRSQLiteSession.transaction")
		const crsqliteTx = await this.client.imperativeTx()
		const session = new CRSQLiteSession(
			this.client,
			this.dialect,
			this.schema,
			this.options,
			crsqliteTx[1]
		)
		const tx = new CRSQLTransaction("async", this.dialect, session, this.schema)
		try {
			const result = await tx.transaction(transaction)
			crsqliteTx[0]()
			return result
		} catch (err) {
			crsqliteTx[0]()
			throw err
		}
	}

	exec(query: string) {
		console.log("CRSQLiteSession.exec")
		this.logger.logQuery(query, [])
		return (this.tx ?? this.client).exec(query)
	}

	// TODO: can we implement these methods without going through a prepared query? (they are called when doing "one time queries")
	// run(query: SQL) {
	// 	console.log("CRSQLiteSession.run")
	// 	return this.client.run(query)
	// }
	// all<T = unknown>(query: SQL<unknown>): Promise<T[]> {
	// 	console.log("CRSQLiteSession.all")
	// 	return this.client.all(query)
	// }
	// get<T = unknown>(query: SQL<unknown>): Promise<T> {
	// 	console.log("CRSQLiteSession.get")
	// 	return this.client.get(query)
	// }
	// values<T extends any[] = unknown[]>(query: SQL<unknown>): Promise<T[]> {
	// 	console.log("CRSQLiteSession.values")
	// 	return this.client.values(query)
	// }
}

type StmtAsync = Awaited<ReturnType<DB["prepare"]>>

// TODO: this interface augmentation doesn't work, why? we do get a `SQLitePreparedQuery` when calling `.prepare()` but it doesn't have the `finalize` method at the type level
declare module "drizzle-orm/session" {
	interface PreparedQuery {
		finalize(): Promise<void>
	}
}

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
		private oneTime: boolean,
		private logger: Logger,
		fields: SelectedFieldsOrdered | undefined,
		private tx: Transaction[1] | null,
		executeMethod: SQLiteExecuteMethod,
		private customResultMapper?: (rows: unknown[][]) => unknown
	) {
		super("async", executeMethod, query)
		this.stmt = (this.tx ?? this.client).prepare(query.sql)
	}

	/**
	 * execute query, no result expected
	 */
	async run(placeholderValues?: Record<string, unknown>): Promise<void> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		await stmt.run(this.tx, ...params)
		if (this.oneTime) {
			void stmt.finalize(this.tx)
		}
	}

	/**
	 * execute query and return all rows
	 */
	async all(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		stmt.raw(Boolean(this.customResultMapper))
		const rows = await stmt.all(this.tx, ...params)
		console.log("CRSQLPreparedQuery.all", rows)
		if (this.oneTime) {
			void stmt.finalize(this.tx)
		}
		return this.customResultMapper ? this.customResultMapper(rows) : rows
	}

	/**
	 * only query first row
	 */
	async get(placeholderValues?: Record<string, unknown>): Promise<unknown | undefined> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		stmt.raw(Boolean(this.customResultMapper))
		const row = await stmt.get(this.tx, ...params)
		if (this.oneTime) {
			void stmt.finalize(this.tx)
		}
		return this.customResultMapper ? this.customResultMapper([row]) : row
	}

	/**
	 * directly extract first column value from each row
	 */
	async values(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		stmt.raw(true)
		const rows = (await stmt.all(null, ...params)) as unknown[][]
		if (this.oneTime) {
			void stmt.finalize(this.tx)
		}
		return rows.map((row) => row[0])
	}

	async finalize(): Promise<void> {
		if (this.oneTime) {
			throw new Error("Cannot finalize one-time query")
		}
		const stmt = await this.stmt
		await stmt.finalize(this.tx)
	}
}

export class CRSQLTransaction<
	TFullSchema extends Record<string, unknown>,
	TSchema extends TablesRelationalConfig,
> extends SQLiteTransaction<"async", void, TFullSchema, TSchema> {
	static readonly [entityKind]: string = "CRSQLTransaction"

	override async transaction<T>(
		transaction: (tx: CRSQLTransaction<TFullSchema, TSchema>) => Promise<T>
	): Promise<T> {
		console.log("CRSQLTransaction.transaction inside transaction function of transaction class")
		const savepointName = `sp${this.nestedIndex}`
		const tx = new CRSQLTransaction(
			"async",
			this.dialect,
			this.session,
			this.schema,
			this.nestedIndex + 1
		)
		await this.session.exec(`SAVEPOINT ${savepointName};`)
		try {
			const result = await transaction(tx)
			await this.session.exec(`RELEASE savepoint ${savepointName};`)
			return result
		} catch (err) {
			await this.session.exec(`ROLLBACK TO savepoint ${savepointName};`)
			throw err
		}
	}
}
