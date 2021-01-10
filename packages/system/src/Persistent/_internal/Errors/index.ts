// Copyright https://github.com/frptools

export function throwError(s = ""): never {
  throw new Error(s)
}

export function throwNotImplemented(s: string) {
  return throwError(`Not implemented${s ? `: ${s}` : ""}`)
}

export function throwNotSupported(s: string) {
  return throwError(`Operation not supported${s ? `: ${s}` : ""}`)
}

export function throwInvalidOperation(s: string) {
  return throwError(`Invalid operation${s ? `: ${s}` : ""}`)
}

export function throwMissing(name: string, message?: string) {
  return throwError(
    `No value is defined${
      name ? ` for "${name}"${message ? ` (${message})` : ""}` : ""
    }`
  )
}

export function throwArgumentError(name: string, message?: string) {
  return throwError(
    `Invalid ${name ? `value for parameter "${name}"` : "argument value"}${
      message ? `: ${message}` : ""
    }`
  )
}

export function error(s: string) {
  return () => throwError(s)
}

export function notImplemented(s: string) {
  return () => throwNotImplemented(s)
}

export function notSupported(s: string) {
  return () => throwNotSupported(s)
}

export function invalidOperation(s: string) {
  return () => throwInvalidOperation(s)
}

export function missing(name: string, message?: string) {
  return () => throwMissing(name, message)
}

export function argumentError(name: string, message?: string) {
  return () => throwArgumentError(name, message)
}
