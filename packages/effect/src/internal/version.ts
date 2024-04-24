let moduleVersion = "3.0.4"

export const getCurrentVersion = () => moduleVersion

export const setCurrentVersion = (version: string) => {
  moduleVersion = version
}
