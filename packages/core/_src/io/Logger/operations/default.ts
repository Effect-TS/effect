/**
 * @tsplus static effect/core/io/Logger.Ops default
 */
export const defaultLogger: Logger<string, string> = {
  apply: (fiberId, logLevel, message, cause, _context, spans, annotations) => {
    const now = new Date()
    const nowMillis = now.getTime()

    const outputArray = [
      `timestamp=${now.toISOString()}`,
      `level=${logLevel.label}`,
      `fiber=${fiberId.threadName}`
    ]

    if (message.length > 0) {
      outputArray.push(`message="${message}"`)
    }

    if (cause != null && cause != Cause.empty) {
      // TODO(Mike/Max): implement once tracing is complete
      outputArray.push(`cause="${cause.pretty()}"`)
    }

    let output = outputArray.join(" ")

    if (spans.length > 0) {
      output = output + " "

      let first = true
      for (const span of spans) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = output + span.render(nowMillis)
      }
    }

    if (annotations.size > 0) {
      output = output + " "

      let first = true
      for (const [key, value] of annotations) {
        if (first) {
          first = false
        } else {
          output = output + " "
        }
        output = appendQuoted(key, output)
        output = output + "="
        output = appendQuoted(value, output)
      }
    }

    return output
  }
}

function appendQuoted(label: string, output: string): string {
  if (label.indexOf(" ") < 0) {
    return output + label
  } else {
    return output + `"${label}"`
  }
}
