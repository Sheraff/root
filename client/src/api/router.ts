import { useQuery, type UseQueryResult } from "@tanstack/react-query"
import type { ApiRouter } from "server/api"

type GetApiRoute = {
	[Key in keyof ApiRouter]: ApiRouter[Key] extends { get: any } ? Key : never
}[keyof ApiRouter]

type foo = ApiRouter["/api/hello"]["get"][""]

type GetWithParams = {
	[Key in GetApiRoute]: ApiRouter[Key]["get"] extends { querystring?: object } ? Key : never
}[GetApiRoute]

type GetWithoutParams = {
	[Key in GetApiRoute]: ApiRouter[Key]["get"] extends { querystring?: {} } ? never : Key
}[GetApiRoute]

export function useApiQuery<T extends GetWithParams>(
	route: T,
	query: ApiRouter[T]["get"]["querystring"]
): UseQueryResult<ApiRouter[T]["get"]["response"]>
export function useApiQuery<T extends GetWithoutParams>(
	route: T
): UseQueryResult<ApiRouter[T]["get"]["response"]>
export function useApiQuery<T extends GetApiRoute>(route: T) {
	return useQuery({
		queryKey: [route],
		queryFn: async () => {
			const res = await fetch(route)
			if (!res.ok) {
				throw new Error("Network response was not ok")
			}
			const data = await res.json()
			return data as ApiRouter[T]["get"] extends { response: infer R } ? R : unknown
		},
	})
}

const { data } = useApiQuery("/api/hello")
