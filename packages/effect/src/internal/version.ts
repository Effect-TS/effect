let moduleVersion = "2.3.6"

/** @internal */
export const getCurrentVersion = () => moduleVersion

/** @internal */
export const setCurrentVersion = (version: string) => {
  moduleVersion = version
}
