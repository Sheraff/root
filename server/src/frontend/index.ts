import { type FastifyInstance } from "fastify"
import path from "node:path"
import { fileURLToPath } from "node:url"
import fastifyStatic from "@fastify/static"

const csp = {
	"default-src": ["'self'"],
	"script-src": ["'self'", "'wasm-unsafe-eval'"],
	"style-src": ["'self'", "'unsafe-inline'"],
	"img-src": ["'self'", "data:"],
	"font-src": ["'self'"],
	"connect-src": ["'self'"],
	"media-src": ["'self'"],
	"object-src": ["none"],
	"frame-src": ["none"],
	"worker-src": ["'self'"],
	"form-action": ["none"],
	"base-uri": ["'self'"],
	"manifest-src": ["'self'"],
	"upgrade-insecure-requests": true,
	"frame-ancestors": ["'self'"],
} as const

/**
 * Commented out policies are not yet supported by the Permissions-Policy header.
 */
const pp = {
	accelerometer: [],
	// "ambient-light-sensor": [],
	"attribution-reporting": [],
	autoplay: [],
	// battery: [],
	"browsing-topics": [],
	camera: [],
	"display-capture": [],
	// "document-domain": [],
	"encrypted-media": [],
	// "execution-while-not-rendered": [],
	// "execution-while-out-of-viewport": [],
	fullscreen: [],
	gamepad: [],
	geolocation: [],
	gyroscope: [],
	hid: [],
	"identity-credentials-get": [],
	"idle-detection": [],
	"local-fonts": ["self"],
	magnetometer: [],
	microphone: [],
	midi: [],
	"otp-credentials": [],
	payment: [],
	"picture-in-picture": [],
	// "publickey-credentials-create": [],
	"publickey-credentials-get": [],
	"screen-wake-lock": [],
	serial: [],
	// "speaker-selection": [],
	"storage-access": [],
	usb: [],
	// "web-share": [],
	"window-management": [],
	"xr-spatial-tracking": [],
} as const

const cspHeader = Object.entries(csp)
	.map(([key, value]) => (value === true ? key : `${key} ${value.join(" ")}`))
	.join("; ")

const permissionsPolicyHeader = Object.entries(pp)
	.map(([key, value]) => `${key}=(${value.join(" ")})`)
	.join(", ")

const hstsHeader = "max-age=15552000; includeSubDomains"

const referrerPolicyHeader = "no-referrer"
const openerPolicyHeader = "same-origin"
const resourcePolicyHeader = "same-origin"

/**
 * Use `@fastify/static` to serve the `dist/client` directory.
 */
export default function frontend(fastify: FastifyInstance, opts: object, done: () => void) {
	const __filename = fileURLToPath(import.meta.url)
	const __dirname = path.dirname(__filename)
	const clientDir = path.join(__dirname, "../../dist/client")

	void fastify.register(fastifyStatic, {
		root: clientDir,
		prefix: "/",
		wildcard: false,
		preCompressed: true,
		setHeaders(res, path) {
			if (path.endsWith(".html")) {
				void res.setHeader("content-security-policy", cspHeader)
				void res.setHeader("permissions-policy", permissionsPolicyHeader)
				void res.setHeader("strict-transport-security", hstsHeader)
				void res.setHeader("referrer-policy", referrerPolicyHeader)
				void res.setHeader("cross-origin-opener-policy", openerPolicyHeader)
				void res.setHeader("cross-origin-resource-policy", resourcePolicyHeader)
			}
		},
	})

	const swDir = path.join(__dirname, "../../dist/worker")

	fastify.get("/sw.js", function (req, reply) {
		void reply.sendFile("sw.js", swDir)
	})

	fastify.get("/sw.js.map", function (req, reply) {
		void reply.sendFile("sw.js.map", swDir)
	})

	fastify.get("/*", function (req, reply) {
		void reply.header("content-security-policy", cspHeader)
		void reply.header("permissions-policy", permissionsPolicyHeader)
		void reply.header("strict-transport-security", hstsHeader)
		void reply.header("referrer-policy", referrerPolicyHeader)
		void reply.header("cross-origin-opener-policy", openerPolicyHeader)
		void reply.header("cross-origin-resource-policy", resourcePolicyHeader)
		void reply.sendFile("index.html", clientDir)
	})

	done()
}
