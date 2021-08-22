/**
 *
 * A recommended value for `millisFromEpoch` is similar to the result
 * of `Date.now()`.
 */
export const hasNumberOfMinutesPast = (
	millisFromEpoch: number,
	numberOfMinutes: number
) => {
	const elapsedMinutes = (Date.now() - millisFromEpoch) / 1000 / 60
	return elapsedMinutes > numberOfMinutes
}

export const sleep = (time: number) =>
	new Promise((resolve: (value?: undefined) => void) => {
		setTimeout(resolve, time)
	})

export const isFunction = (item: any): item is Function => {
	return typeof item === "function"
}

export const isObject = <T extends object | any[]>(item: any): item is T => {
	return item && typeof item === "object"
}
