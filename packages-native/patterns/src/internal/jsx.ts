/**
 * Internal primitives shared by the JSX runtimes.
 *
 * @since 0.0.0
 * @internal
 */
const REACT_ELEMENT_TYPE = Symbol.for("react.element")
const REACT_FRAGMENT_TYPE = Symbol.for("react.fragment")

/**
 * Normalized key representation carried by JSX elements.
 *
 * @since 0.0.0
 * @internal
 */
export type JsxKey = string | null

/**
 * Ref value accepted by JSX elements.
 *
 * @since 0.0.0
 * @internal
 */
export type JsxRef = unknown

/**
 * Additional metadata recorded when producing JSX elements.
 *
 * @since 0.0.0
 * @internal
 */
export interface JsxMeta {
  readonly source?: unknown
  readonly owner?: unknown
}

/**
 * Props record carried by JSX elements.
 *
 * @since 0.0.0
 * @internal
 */
export type JsxProps = Record<string, unknown>

/**
 * React-compatible object produced by the JSX runtime.
 *
 * @since 0.0.0
 * @internal
 */
export interface JsxElement {
  readonly $$typeof: typeof REACT_ELEMENT_TYPE
  readonly type: unknown
  readonly key: JsxKey
  readonly ref: JsxRef
  readonly props: JsxProps
  readonly _owner: unknown
  readonly _source?: unknown
  readonly _store?: Record<string, unknown>
}

const normalizeKey = (key: unknown): JsxKey => {
  if (key === undefined || key === null) {
    return null
  }
  return String(key)
}

const cloneProps = (props: Record<string, unknown> | null | undefined): JsxProps => {
  if (!props) {
    return {}
  }
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    if (key === "key" || key === "ref" || key === "__self" || key === "__source") {
      continue
    }
    result[key] = props[key]
  }
  return result
}

const resolveKey = (
  providedKey: unknown,
  props: Record<string, unknown> | null | undefined
): JsxKey => {
  if (providedKey !== undefined) {
    return normalizeKey(providedKey)
  }
  if (props && props.key !== undefined) {
    return normalizeKey(props.key)
  }
  return null
}

const resolveRef = (props: Record<string, unknown> | null | undefined): JsxRef => {
  if (props && props.ref !== undefined) {
    return props.ref
  }
  return null
}

const createElement = (
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  key: unknown,
  meta?: JsxMeta
): JsxElement => {
  const cloned = cloneProps(props)
  const base: JsxElement = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key: resolveKey(key, props),
    ref: resolveRef(props),
    props: cloned,
    _owner: meta?.owner ?? null
  }
  return meta?.source !== undefined
    ? { ...base, _source: meta.source }
    : base
}

/**
 * Symbol identifying fragment elements.
 *
 * @since 0.0.0
 * @internal
 */
export const Fragment = REACT_FRAGMENT_TYPE

/**
 * Creates a JSX element for single-child scenarios.
 *
 * @since 0.0.0
 * @internal
 */
export const jsx = (
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  key?: unknown
): JsxElement => createElement(type, props, key)

/**
 * Creates a JSX element for multi-child scenarios.
 *
 * @since 0.0.0
 * @internal
 */
export const jsxs = (
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  key?: unknown
): JsxElement => createElement(type, props, key)

/**
 * Creates a JSX element that captures dev-time metadata.
 *
 * @since 0.0.0
 * @internal
 */
export const jsxDEV = (
  type: unknown,
  props: Record<string, unknown> | null | undefined,
  key: unknown,
  _isStaticChildren: boolean,
  source?: unknown,
  owner?: unknown
): JsxElement => createElement(type, props, key, { source, owner })
