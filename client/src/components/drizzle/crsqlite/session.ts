// import type { Client, InArgs, InStatement, ResultSet, Transaction } from '@libsql/client';
import type { SQLite3, DB } from "@vlcn.io/crsqlite-wasm"
import type { BatchItem as BatchItem } from "drizzle-orm/batch"
import { entityKind } from "drizzle-orm/entity"
import type { Logger } from "drizzle-orm/logger"
import { NoopLogger } from "drizzle-orm/logger"
import type { RelationalSchemaConfig, TablesRelationalConfig } from "drizzle-orm/relations"
import type { PreparedQuery } from "drizzle-orm/session"
import { fillPlaceholders, type Query, sql } from "drizzle-orm/sql/sql"
import type { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core/dialect"
import { type SQLiteTransaction } from "drizzle-orm/sqlite-core"
import type { SelectedFieldsOrdered } from "drizzle-orm/sqlite-core/query-builders/select.types"
import type {
	PreparedQueryConfig,
	SQLiteExecuteMethod,
	SQLiteTransactionConfig,
} from "drizzle-orm/sqlite-core/session"
import { SQLitePreparedQuery, SQLiteSession } from "drizzle-orm/sqlite-core/session"
// import { mapResultRow } from 'drizzle-orm/utils';

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
		dialect: SQLiteAsyncDialect,
		private schema: RelationalSchemaConfig<TSchema> | undefined,
		private options: CRSQLiteSessionOptions
		// private tx: Transaction | undefined,
	) {
		super(dialect)
		this.logger = options.logger ?? new NoopLogger()
	}

	prepareQuery<T extends PreparedQueryConfig>(
		query: Query,
		fields: SelectedFieldsOrdered | undefined,
		executeMethod: SQLiteExecuteMethod,
		customResultMapper?: (rows: unknown[][]) => unknown
	): CRSQLPreparedQuery<T> {
		return new CRSQLPreparedQuery(
			this.client,
			query,
			this.logger,
			fields,
			// this.tx,
			executeMethod,
			customResultMapper
		)
	}
}

type StmtAsync = Awaited<ReturnType<DB["prepare"]>>

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
		// private tx:
		// 	| SQLiteTransaction<"async", void, Record<string, unknown>, TablesRelationalConfig>
		// 	| undefined,
		executeMethod: SQLiteExecuteMethod,
		private customResultMapper?: (rows: unknown[][]) => unknown
	) {
		super("async", executeMethod, query)
		this.stmt = this.client.prepare(query.sql)
	}

	async run(placeholderValues?: Record<string, unknown>): Promise<void> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		await stmt.run(null, ...params)
	}

	async all(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const rows = await stmt.all(null, ...params)
		return this.customResultMapper ? this.customResultMapper(rows) : rows
	}

	async get(placeholderValues?: Record<string, unknown>): Promise<unknown | undefined> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const row = await stmt.get(null, ...params)
		return this.customResultMapper ? this.customResultMapper([row]) : row
	}

	async values(placeholderValues?: Record<string, unknown>): Promise<unknown[]> {
		const params = fillPlaceholders(this.query.params, placeholderValues ?? {})
		this.logger.logQuery(this.query.sql, params)
		const stmt = await this.stmt
		const rows = await stmt.all(null, ...params)
		// wtf is `.values` supposed to do?
		return rows.map((row) => Object.values(row)[0])
	}
}
