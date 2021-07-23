// ets_tracing: off

let _tracing = false

export function enableTracing() {
  _tracing = true
}

export function disableTracing() {
  _tracing = false
}

export function isTracingEnabled() {
  return _tracing
}
