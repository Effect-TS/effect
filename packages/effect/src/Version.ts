/**
 * The release version of the `effect` package.
 *
 * Telemetry integrations use it to identify Effect, for example in OTLP
 * `User-Agent` headers, `telemetry.sdk.version` resource attributes and
 * instrumentation scope versions.
 *
 * @since 4.0.2
 */
import { version } from "./internal/version.ts"

let currentVersion: string = version

/**
 * Returns the current version of the `effect` package.
 *
 * **Details**
 *
 * Defaults to the published release version. Returns the value passed to
 * `setCurrentVersion` after an override.
 *
 * @category getters
 * @since 4.0.2
 */
export const getCurrentVersion = (): string => currentVersion

/**
 * Overrides the version returned by `getCurrentVersion`.
 *
 * **Gotchas**
 *
 * The override is global to this copy of the module. Telemetry layers read the
 * version when they are built, so overriding it later does not change
 * telemetry that has already been configured.
 *
 * @category setters
 * @since 4.0.2
 */
export const setCurrentVersion = (version: string): void => {
  currentVersion = version
}
