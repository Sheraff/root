import { useAuthContext } from "client/auth/useAuthContext"
import { Content } from "client/db/DbTest"

export function DbDemo() {
	const auth = useAuthContext()
	if (auth.type !== "signed-in") {
		return <div>User DB only available to signed-in users</div>
	}
	return <Content name={auth.userId} />
}
