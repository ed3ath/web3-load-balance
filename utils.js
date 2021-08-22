"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObject = exports.isFunction = exports.sleep = exports.hasNumberOfMinutesPast = void 0;
/**
 *
 * A recommended value for `millisFromEpoch` is similar to the result
 * of `Date.now()`.
 */
const hasNumberOfMinutesPast = (millisFromEpoch, numberOfMinutes) => {
    const elapsedMinutes = (Date.now() - millisFromEpoch) / 1000 / 60;
    return elapsedMinutes > numberOfMinutes;
};
exports.hasNumberOfMinutesPast = hasNumberOfMinutesPast;
const sleep = (time) => new Promise((resolve) => {
    setTimeout(resolve, time);
});
exports.sleep = sleep;
const isFunction = (item) => {
    return typeof item === "function";
};
exports.isFunction = isFunction;
const isObject = (item) => {
    return item && typeof item === "object";
};
exports.isObject = isObject;
