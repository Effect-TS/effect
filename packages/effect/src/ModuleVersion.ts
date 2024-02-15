/**
 * @since 2.0.0
 *
 * Enables low level framework authors to run on their own isolated effect version
 */
import * as internal from "./internal/version.js"

/**
 * @since 2.0.0
 * @category version
 */
export const getCurrentVersion: () => string = internal.getCurrentVersion

/**
 * @since 2.0.0
 * @category version
 */
export const setCurrentVersion: (version: string) => void = internal.setCurrentVersion
