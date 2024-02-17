declare const __AUTH_PROVIDERS__: readonly string[]

// ensure we get errors if css file is not found
declare module "*.module.css" {
	const styles: object
	export default styles
}
