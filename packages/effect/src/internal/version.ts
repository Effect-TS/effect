let moduleVersion = "3.3.0"

export const getCurrentVersion = () => moduleVersion

export const setCurrentVersion = (version: string) => {
  moduleVersion = version
}
