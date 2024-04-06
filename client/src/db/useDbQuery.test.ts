import { afterAll, beforeAll, describe, expect, test, vi, beforeEach } from "vitest"
import { QueryClient, QueryObserver, type QueryCache } from "@tanstack/react-query"
import { UNIQUE_KEY, start, type DbQueryKey } from "client/db/useDbQuery"
import type { Ctx } from "client/db/DbProvider"
import { nextTick } from "node:process"

describe.sequential("'start' listening to QueryCache for live SQL queries", () => {
	let client: QueryClient
	let cache: QueryCache
	const events: string[] = []
	let unsubscribeCache: () => void
	let triggerTableUpdate: (type: Array<18 | 23 | 9>) => void
	const unsubscribeObservers: Record<string, () => void> = {}
	const onRange = vi.fn((_, callback) => {
		triggerTableUpdate = callback
		return () => {}
	})
	let stop: () => void

	beforeAll(() => {
		client = new QueryClient()
		cache = client.getQueryCache()
		unsubscribeCache = cache.subscribe((event) => {
			const key = event.query.queryKey as DbQueryKey
			let label = key[3][0] + " > " + event.type
			if (event.type === "updated") {
				label += "::" + event.action.type
			}
			events.push(label)
		})
		const ctx = {
			client: {
				db: 1,
				tablesUsedStmt: { all: () => [["foo_table"]] },
				prepare: () => Promise.resolve({ finalize: () => {} }),
			},
			rx: {
				onRange,
			},
		}

		stop = start(1, ctx as unknown as Ctx, client)
	})

	afterAll(() => {
		unsubscribeCache()
		stop()
	})

	beforeEach(() => {
		events.length = 0
	})

	test("Mount 1st query", async () => {
		const observer = new QueryObserver(client, {
			queryKey: [
				UNIQUE_KEY,
				1,
				"SELECT * FROM foo",
				["first"],
				{ 18: true, 23: true, 9: true },
			],
			queryFn: () => "data",
			staleTime: 0,
		})
		unsubscribeObservers.one = observer.subscribe(vi.fn())
		expect(events).toMatchInlineSnapshot(`
			[
			  "first > added",
			  "first > observerResultsUpdated",
			  "first > observerAdded",
			  "first > observerResultsUpdated",
			  "first > updated::fetch",
			]
		`)
		events.length = 0

		await new Promise(nextTick)

		expect(onRange).toHaveBeenCalledTimes(1)
		expect(onRange).toHaveBeenLastCalledWith(["foo_table"], expect.any(Function))

		expect(events).toMatchInlineSnapshot(`
			[
			  "first > observerResultsUpdated",
			  "first > updated::success",
			]
		`)
	})

	test("Mount 2nd query with a matching key (same DB, same SQL)", async () => {
		const observer = new QueryObserver(client, {
			queryKey: [
				UNIQUE_KEY,
				1,
				"SELECT * FROM foo",
				["second"],
				{ 18: true, 23: true, 90: true },
			],
			queryFn: () => "data",
			staleTime: 0,
		})
		unsubscribeObservers.two = observer.subscribe(vi.fn())
		expect(events).toMatchInlineSnapshot(`
			[
			  "second > added",
			  "second > observerResultsUpdated",
			  "second > observerAdded",
			  "second > observerResultsUpdated",
			  "second > updated::fetch",
			]
		`)
		events.length = 0

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "second > observerResultsUpdated",
			  "second > updated::success",
			]
		`)
	})

	test("Simulate a 'live query' triggering an update on a table used by those 2 queries", async () => {
		triggerTableUpdate!([18])

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "first > updated::invalidate",
			  "first > observerResultsUpdated",
			  "first > updated::fetch",
			  "second > updated::invalidate",
			  "second > observerResultsUpdated",
			  "second > updated::fetch",
			  "first > observerResultsUpdated",
			  "first > updated::success",
			  "second > observerResultsUpdated",
			  "second > updated::success",
			]
		`)
	})

	test("Simulate a 'live query' triggering an update on a table used by only 1 query", async () => {
		triggerTableUpdate!([9])

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "first > updated::invalidate",
			  "first > observerResultsUpdated",
			  "first > updated::fetch",
			  "first > observerResultsUpdated",
			  "first > updated::success",
			]
		`)
	})

	test("Unmount 2nd query", async () => {
		unsubscribeObservers.two!()

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "second > observerRemoved",
			]
		`)
	})

	test("Unmount 1st query", async () => {
		unsubscribeObservers.one!()

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "first > observerRemoved",
			]
		`)

		await new Promise(nextTick)
		expect(onRange).toHaveBeenCalledTimes(1)
	})

	test("Mount and unmount a 3rd matching query (same DB, same SQL)", async () => {
		const unsubScribeObserver = new QueryObserver(client, {
			queryKey: [
				UNIQUE_KEY,
				1,
				"SELECT * FROM foo",
				["third"],
				{ 18: true, 23: true, 9: true },
			],
			queryFn: () => "data",
			staleTime: 0,
		}).subscribe(vi.fn())

		expect(events).toMatchInlineSnapshot(`
			[
			  "third > added",
			  "third > observerResultsUpdated",
			  "third > observerAdded",
			  "third > observerResultsUpdated",
			  "third > updated::fetch",
			]
		`)
		events.length = 0

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "third > observerResultsUpdated",
			  "third > updated::success",
			]
		`)
		events.length = 0

		unsubScribeObserver()

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "third > observerRemoved",
			]
		`)

		expect(onRange).toHaveBeenCalledTimes(1)
	})

	test("Only if a change happens after the last observer is unmounted, the onRange listener is unsubscribed", async () => {
		// we invalidate all by triggering a table update, but listener would also unsubscribe if all queries had reached their gcTime
		triggerTableUpdate!([23])

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "first > updated::invalidate",
			  "second > updated::invalidate",
			  "third > updated::invalidate",
			]
		`)

		expect(onRange).toHaveBeenCalledTimes(1)
	})

	test("Mount and unmount a 4th matching query (same DB, same SQL), after all other have been invalidated", async () => {
		const unsubScribeObserver = new QueryObserver(client, {
			queryKey: [
				UNIQUE_KEY,
				1,
				"SELECT * FROM foo",
				["fourth"],
				{ 18: true, 23: true, 9: true },
			],
			queryFn: () => "data",
			staleTime: 0,
		}).subscribe(vi.fn())

		expect(events).toMatchInlineSnapshot(`
			[
			  "fourth > added",
			  "fourth > observerResultsUpdated",
			  "fourth > observerAdded",
			  "fourth > observerResultsUpdated",
			  "fourth > updated::fetch",
			]
		`)
		events.length = 0

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "fourth > observerResultsUpdated",
			  "fourth > updated::success",
			]
		`)
		events.length = 0

		unsubScribeObserver()

		await new Promise(nextTick)

		expect(events).toMatchInlineSnapshot(`
			[
			  "fourth > observerRemoved",
			]
		`)
		events.length = 0

		expect(onRange).toHaveBeenCalledTimes(2)
		expect(onRange).toHaveBeenLastCalledWith(["foo_table"], expect.any(Function))
	})
})
