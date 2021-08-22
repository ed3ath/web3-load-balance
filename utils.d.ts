/**
 *
 * A recommended value for `millisFromEpoch` is similar to the result
 * of `Date.now()`.
 */
export declare const hasNumberOfMinutesPast: (millisFromEpoch: number, numberOfMinutes: number) => boolean;
export declare const sleep: (time: number) => Promise<undefined>;
export declare const isFunction: (item: any) => item is Function;
export declare const isObject: <T extends object | any[]>(item: any) => item is T;
