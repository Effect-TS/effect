let moduleVersion = "3.19.3"

export const getCurrentVersion = () => moduleVersion

export const setCurrentVersion = (version: string) => {
  moduleVersion = version
}
