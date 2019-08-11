/**
 * Decorate property with defaults.
 *
 * @param enumerable Is enumerable.
 * @param configurable Is configurable.
 * @param writable Is writable.
 * @returns Decorator function.
 */
export function property(
	enumerable = true,
	configurable = true,
	writable = true
) {
	return function(
		_target: any,
		_key: string | symbol,
		descriptor?: PropertyDescriptor
	) {
		const d = descriptor as PropertyDescriptor;
		d.enumerable = enumerable;
		d.configurable = configurable;
		d.writable = writable;
	};
}

/**
 * Decorate method with defaults.
 *
 * @param enumerable Is enumerable.
 * @param configurable Is configurable.
 * @param writable Is writable.
 * @returns Decorator function.
 */
export function method(
	enumerable = false,
	configurable = true,
	writable = true
) {
	return function(
		_target: any,
		_key: string | symbol,
		descriptor?: PropertyDescriptor
	) {
		const d = descriptor as PropertyDescriptor;
		d.enumerable = enumerable;
		d.configurable = configurable;
		d.writable = writable;
	};
}
