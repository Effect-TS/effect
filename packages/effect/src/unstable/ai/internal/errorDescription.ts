/** @internal */
export const buildErrorDescription = (params: {
  readonly status: number
  readonly message: string | undefined
  readonly method: string
  readonly url: string
  readonly errorCode?: string | number | null | undefined
  readonly errorType?: string | null | undefined
  readonly requestId?: string | null | undefined
  readonly body: string | undefined
}): string => {
  const parts: Array<string> = []

  if (params.message) {
    parts.push(params.message)
  } else {
    parts.push(`HTTP ${params.status}`)
  }

  parts.push(`(${params.method} ${params.url})`)

  if (params.errorCode) {
    parts.push(`[code: ${params.errorCode}]`)
  } else if (params.errorType) {
    parts.push(`[type: ${params.errorType}]`)
  }

  if (params.requestId) {
    parts.push(`[requestId: ${params.requestId}]`)
  }

  if (!params.message && params.body) {
    const truncated = params.body.length > 200
      ? params.body.slice(0, 200) + "..."
      : params.body
    parts.push(`Response: ${truncated}`)
  }

  return parts.join(" ")
}
