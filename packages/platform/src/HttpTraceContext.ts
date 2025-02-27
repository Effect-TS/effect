/**
 * @since 1.0.0
 */
import * as Option from "effect/Option"
import * as Tracer from "effect/Tracer"
import * as Headers from "./Headers.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface FromHeaders {
  (headers: Headers.Headers): Option.Option<Tracer.ExternalSpan>
}

/**
 * @since 1.0.0
 * @category encoding
 */
export const toHeaders = (span: Tracer.Span): Headers.Headers =>
  Headers.unsafeFromRecord({
    b3: `${span.traceId}-${span.spanId}-${span.sampled ? "1" : "0"}${
      span.parent._tag === "Some" ? `-${span.parent.value.spanId}` : ""
    }`,
    traceparent: `00-${span.traceId}-${span.spanId}-${span.sampled ? "01" : "00"}`
  })

/**
 * @since 1.0.0
 * @category decoding
 */
export const fromHeaders = (headers: Headers.Headers): Option.Option<Tracer.ExternalSpan> => {
  let span = w3c(headers)
  if (span._tag === "Some") {
    return span
  }
  span = b3(headers)
  if (span._tag === "Some") {
    return span
  }
  return xb3(headers)
}

/**
 * @since 1.0.0
 * @category decoding
 */
export const b3: FromHeaders = (headers) => {
  if (!("b3" in headers)) {
    return Option.none()
  }
  const parts = headers["b3"].split("-")
  if (parts.length < 2) {
    return Option.none()
  }
  return Option.some(Tracer.externalSpan({
    traceId: parts[0],
    spanId: parts[1],
    sampled: parts[2] ? parts[2] === "1" : true
  }))
}

/**
 * @since 1.0.0
 * @category decoding
 */
export const xb3: FromHeaders = (headers) => {
  if (!(headers["x-b3-traceid"]) || !(headers["x-b3-spanid"])) {
    return Option.none()
  }
  return Option.some(Tracer.externalSpan({
    traceId: headers["x-b3-traceid"],
    spanId: headers["x-b3-spanid"],
    sampled: headers["x-b3-sampled"] ? headers["x-b3-sampled"] === "1" : true
  }))
}

const w3cTraceId = /^[0-9a-f]{32}$/i
const w3cSpanId = /^[0-9a-f]{16}$/i

/**
 * @since 1.0.0
 * @category decoding
 */
export const w3c: FromHeaders = (headers) => {
  if (!(headers["traceparent"])) {
    return Option.none()
  }
  const parts = headers["traceparent"].split("-")
  if (parts.length !== 4) {
    return Option.none()
  }
  const [version, traceId, spanId, flags] = parts
  switch (version) {
    case "00": {
      if (w3cTraceId.test(traceId) === false || w3cSpanId.test(spanId) === false) {
        return Option.none()
      }
      return Option.some(Tracer.externalSpan({
        traceId,
        spanId,
        sampled: (parseInt(flags, 16) & 1) === 1
      }))
    }
    default: {
      return Option.none()
    }
  }
}
