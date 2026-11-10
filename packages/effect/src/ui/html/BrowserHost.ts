/**
 * The DOM host for `effect/ui`: mounts a component tree into an element of a
 * real document.
 *
 * Events are delegated: the host keeps one listener per event name on the
 * document, and each element stores its handlers as data, so re-rendering
 * never touches listeners. An event goes to the innermost element with a
 * handler for it, and its handler gets a plain payload built from the DOM
 * event, never the event itself. A form the app renders never submits
 * natively, whether or not it has a `submit` handler.
 *
 * `value`, `checked`, `selected` and `open` are controlled. The host sets them
 * after the element's children exist, skips a no-op so the caret doesn't jump,
 * and puts the Model's value back after the user changes it and the Model
 * didn't follow, whether `update` rejected the change or nothing handled it.
 *
 * **Example** (Mounting an app)
 *
 * ```ts
 * import { BrowserHost, Html } from "effect/ui/html"
 * import { Effect, Schema } from "effect"
 * import { Component } from "effect/ui"
 *
 * const Message = Schema.TaggedUnion({ Increment: {} })
 *
 * const Counter = Component.make({
 *   name: "Counter",
 *   model: Schema.Number,
 *   message: Message,
 *   elements: Html,
 *   init: () => 0,
 *   update: (count) => count + 1,
 *   view: (count, h) => h.button(String(count)).onClick(Message.make({ _tag: "Increment" }))
 * })
 *
 * const main = BrowserHost.mount(Counter, {}, document.getElementById("app")!).pipe(
 *   Effect.andThen(Effect.never),
 *   Effect.scoped
 * )
 * ```
 *
 * @stability experimental
 * @since 4.1.3
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import type * as AsyncResult from "../../reactivity/AsyncResult.ts"
import type * as Scope from "../../Scope.ts"
import type * as Component from "../Component.ts"
import * as Renderer from "../Renderer.ts"
import type * as View from "../View.ts"
import * as Html from "./Html.ts"
import * as headSync from "./internal/head.ts"
import * as markers from "./internal/markers.ts"
import * as server from "./internal/server.ts"
import * as submit from "./internal/submit.ts"

const SVG = "http://www.w3.org/2000/svg"

const svgTags: ReadonlySet<string> = new Set([
  "svg",
  "g",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "rect",
  "text",
  "tspan",
  "textPath",
  "defs",
  "use",
  "symbol",
  "clipPath",
  "mask",
  "pattern",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "image",
  "foreignObject"
])

/** Events that don't bubble: only the element they happen on gets them. */
const ownEvents: ReadonlySet<string> = new Set([
  "focus",
  "blur",
  "mouseenter",
  "mouseleave",
  "scroll",
  "toggle",
  "load",
  "error",
  "close",
  "cancel"
])

/** Events after which a controlled property may differ from what the Model says. */
const changeEvents: ReadonlyArray<string> = ["input", "change", "toggle", "close", "reset"]

/** Events the host listens to whether or not a handler wants them. */
const alwaysEvents: ReadonlyArray<string> = [...changeEvents, "submit"]

const controlled: ReadonlySet<string> = new Set(["value", "checked", "selected", "open"])

const emptyValue = (name: string): unknown => name === "value" ? "" : false

interface Bound {
  readonly handlers: Renderer.Handlers
  readonly dispatch: Renderer.Dispatch
}

const modifiers = (event: Event) => {
  const e = event as KeyboardEvent
  return { shift: e.shiftKey === true, ctrl: e.ctrlKey === true, alt: e.altKey === true, meta: e.metaKey === true }
}

const fieldsOf = (form: HTMLFormElement, submitter: HTMLElement | null) => {
  let data: FormData
  try {
    data = new FormData(form, submitter)
  } catch {
    data = new FormData(form)
  }
  // No prototype, so fields named `constructor` or `__proto__` are kept like any other.
  const fields: Record<string, string> = Object.create(null)
  const entries: Array<readonly [string, string]> = []
  data.forEach((value, name) => {
    if (typeof value !== "string") return
    entries.push([name, value])
    if (!Object.hasOwn(fields, name)) fields[name] = value
  })
  return { fields, entries }
}

/**
 * Builds the payload a handler gets: plain data, read from the event and the
 * elements involved.
 */
const payloadOf = (name: string, event: Event, target: EventTarget | null, element: globalThis.Element): unknown => {
  switch (name) {
    case "click":
    case "dblclick":
    case "contextmenu":
    case "mousedown":
    case "mouseup": {
      const e = event as MouseEvent
      return { button: e.button ?? 0, x: e.clientX ?? 0, y: e.clientY ?? 0, ...modifiers(event) }
    }
    case "keydown":
    case "keyup":
      return { key: (event as KeyboardEvent).key ?? "", ...modifiers(event) }
    case "input":
    case "change": {
      const source = (target !== null && "value" in (target as object) ? target : element) as HTMLInputElement
      return source.localName === "input"
        ? { value: source.value, checked: source.checked === true }
        : { value: String(source.value ?? "") }
    }
    case "submit": {
      const form = (element.localName === "form" ? element : target) as HTMLFormElement
      return fieldsOf(form, (event as SubmitEvent).submitter ?? null)
    }
    case "toggle":
      return { open: (element as HTMLDetailsElement).open === true }
    case "close":
      return { returnValue: (element as HTMLDialogElement).returnValue ?? "" }
    case "scroll":
      return { top: element.scrollTop, left: element.scrollLeft }
    default:
      return {}
  }
}

/**
 * Makes a DOM host for `document`, plus `dispose`, which removes its
 * listeners.
 *
 * **Details**
 *
 * Most apps use `layer` or `mount`, which manage this for them. The host shows
 * the `html` vocabulary and host-neutral components. A component of another
 * vocabulary fails its own slot when it mounts.
 *
 * The host keeps the document head in sync with the tree's merged
 * `Head.Head`. It owns only tags marked `data-eui`, plus `<title>` and
 * `lang` / `dir` on `<html>`, and restores the shell's value once no entry
 * sets one. Static titles, `lang`, classes and `data-*` on `<html>` and
 * `<body>` belong in the root component's `head`, not in the shell: HTML
 * keeps the first copy of a duplicated attribute, so the shell's copy would
 * hide the framework's. `warn` reports a shell that conflicts with the head
 * on the first sync, and defaults to `console.warn`. The check runs in every
 * build, as `effect` has no development switch; it looks at the shell once,
 * and `warn: () => {}` silences it.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const makeHost = (
  document: Document,
  options?: { readonly warn?: ((message: string) => void) | undefined }
): Renderer.Host<globalThis.Node> & { readonly dispose: () => void } => {
  const syncHead = headSync.make(
    document,
    // oxlint-disable-next-line no-console
    options?.warn ?? ((message) => console.warn(message))
  )
  const bound = new WeakMap<globalThis.Node, Bound>()
  // The last value the renderer set for each controlled property: what the element must show.
  const wanted = new WeakMap<globalThis.Node, Map<string, unknown>>()
  const listening = new Map<string, (event: Event) => void>()
  const view = document.defaultView
  const later: (f: () => void) => void = view !== null && typeof view.requestAnimationFrame === "function"
    ? (f) => {
      view.requestAnimationFrame(f)
    }
    : (f) => {
      setTimeout(f, 0)
    }

  const restoreNode = (node: globalThis.Node) => {
    const values = wanted.get(node)
    if (values === undefined) return
    const element = node as any
    for (const [name, value] of values) {
      if (element[name] !== value) element[name] = value
    }
  }
  /** Restores `node` and what changing it also changes. */
  const restoreAffected = (node: globalThis.Node): void => {
    restoreNode(node)
    const element = node as HTMLInputElement
    switch (element.localName) {
      case "input": {
        // A radio button unchecks the others in its group.
        if (element.type !== "radio" || element.name === "") return
        const root = element.form ?? element.ownerDocument
        for (const other of root.querySelectorAll(`input[type="radio"]`)) {
          if ((other as HTMLInputElement).name === element.name) restoreNode(other)
        }
        return
      }
      case "select": {
        for (const option of (node as HTMLSelectElement).options) restoreNode(option)
        return
      }
      case "form": {
        // A reset puts every control back to its default without firing input or change.
        for (const control of (node as HTMLFormElement).elements) restoreAffected(control)
        return
      }
    }
  }
  let restoring: Set<globalThis.Node> | undefined
  /**
   * Puts controlled properties back once the event and the flush it caused
   * are over. A flush that accepted the change already moved the wanted value,
   * so this is then a no-op.
   */
  const restoreSoon = (target: EventTarget | null) => {
    if (target === null || !("nodeType" in target)) return
    if (restoring === undefined) {
      restoring = new Set()
      later(() => {
        const nodes = restoring!
        restoring = undefined
        for (const node of nodes) restoreAffected(node)
      })
    }
    restoring.add(target as globalThis.Node)
  }

  const listener = (name: string) => (event: Event) => {
    // The app owns its forms' submissions, handled or not. Other forms in the document are left alone.
    // An unhandled one is marked, so the browser Router can still route a GET form.
    if (name === "submit" && event.target !== null && bound.has(event.target as globalThis.Node)) {
      event.preventDefault()
      submit.ownedUnhandled.add(event)
    }
    const path = event.composedPath()
    const own = ownEvents.has(name)
    for (let i = 0; i < path.length; i++) {
      const node = path[i] as globalThis.Node
      const entry = bound.get(node)
      const handler = entry?.handlers[name]
      if (entry !== undefined && handler !== undefined) {
        if (name === "submit") {
          event.preventDefault()
          submit.ownedUnhandled.delete(event)
        }
        entry.dispatch(name, handler, payloadOf(name, event, event.target, node as globalThis.Element))
        break
      }
      if (own) break
    }
    if (changeEvents.includes(name)) restoreSoon(event.target)
  }

  const listen = (name: string) => {
    if (listening.has(name)) return
    const f = listener(name)
    listening.set(name, f)
    document.addEventListener(name, f, { capture: true })
  }
  for (const name of alwaysEvents) listen(name)

  return {
    createElement: (tag) => svgTags.has(tag) ? document.createElementNS(SVG, tag) : document.createElement(tag),
    createText: (text) => document.createTextNode(text),
    setText(node, text) {
      const t = node as globalThis.Text
      if (t.data !== text) t.data = text
    },
    setAttr(node, name, value) {
      const element = node as globalThis.Element
      if (value === undefined) element.removeAttribute(name)
      else element.setAttribute(name, value)
    },
    setProp(node, name, value) {
      const element = node as any
      if (controlled.has(name)) {
        let values = wanted.get(node)
        if (value === undefined) {
          values?.delete(name)
          value = emptyValue(name)
        } else {
          if (values === undefined) {
            values = new Map()
            wanted.set(node, values)
          }
          values.set(name, value)
        }
        // Skip a no-op, so a caret in the middle of the text stays where it is.
        if (element[name] !== value) element[name] = value
        return
      }
      if (value === undefined) {
        const current = element[name]
        element[name] = typeof current === "string" ? "" : typeof current === "boolean" ? false : null
      } else {
        element[name] = value
      }
    },
    insertBefore: (parent, node, ref) => {
      parent.insertBefore(node, ref ?? null)
    },
    remove: (node) => {
      node.parentNode?.removeChild(node)
    },
    parentOf: (node) => node.parentNode ?? undefined,
    nextOf: (node) => node.nextSibling ?? undefined,
    setEvents(node, handlers, dispatch) {
      bound.set(node, { handlers, dispatch })
      for (const name in handlers) listen(name)
    },
    elements: [Html.name],
    controlled,
    runsMounts: true,
    head: syncHead,
    hydration: {
      firstChild: (node) => node.firstChild ?? undefined,
      inspect(node) {
        switch (node.nodeType) {
          case 1: {
            const tag = (node as globalThis.Element).localName
            return { _tag: "Element", tag, textOnly: server.textOnlyTags.has(tag) }
          }
          case 3:
            return { _tag: "Text", text: (node as globalThis.Text).data }
          case 8:
            return markers.parse((node as globalThis.Comment).data) ?? { _tag: "Other" }
          default:
            return { _tag: "Other" }
        }
      },
      getAttr: (node, name) => (node as globalThis.Element).getAttribute(name) ?? undefined
    },
    dispose: () => {
      for (const [name, f] of listening) document.removeEventListener(name, f, { capture: true })
      listening.clear()
    }
  }
}

/**
 * The element operations behind `Html.focus`, `blur`, `scrollIntoView` and
 * `measure`, on DOM elements.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const htmlHost: Context.Service.Shape<typeof Html.Host> = {
  focus: (element, options) => (element as HTMLElement).focus(options as FocusOptions),
  blur: (element) => (element as HTMLElement).blur(),
  scrollIntoView: (element, options) => element.scrollIntoView(options as ScrollIntoViewOptions),
  measure: (element) => {
    const box = element.getBoundingClientRect()
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      top: box.top,
      right: box.right,
      bottom: box.bottom,
      left: box.left
    }
  }
}

/**
 * Provides the DOM host as the `Renderer`, and `Html.Host`, for the life of
 * the Layer.
 *
 * **Details**
 *
 * `document` defaults to the global `document`. Closing the Layer removes the
 * host's listeners.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.3
 */
export const layer = (options?: {
  readonly document?: Document | undefined
}): Layer.Layer<Renderer.Renderer | Html.Host> =>
  Layer.effectContext(Effect.gen(function*() {
    const host = makeHost(options?.document ?? globalThis.document)
    yield* Effect.addFinalizer(() => Effect.sync(host.dispose))
    return Context.make(Renderer.Renderer, { host }).pipe(Context.add(Html.Host, htmlHost))
  }))

/**
 * Passes when a root shows HTML or is host-neutral, and otherwise names the
 * host its vocabulary needs.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.3
 */
export type HtmlRoot<V> = [Renderer.HostOf<V>] extends [Html.Host] ? unknown
  : { readonly "BrowserHost.mount shows HTML elements. This root's vocabulary needs": Renderer.HostOf<V> }

/**
 * Mounts a component tree into `container`, for the life of the current
 * Scope.
 *
 * **Details**
 *
 * The root must render HTML (or be host-neutral): mounting a root of another
 * vocabulary is a type error. Nested components are checked when they mount,
 * and one of another vocabulary fails its own slot. The tree's requirements
 * are the root's, minus `Html.Host`, which the host provides. When the root
 * itself fails, `fallback` is shown in its place.
 *
 * Commands and Subscriptions run on the default scheduler, the render flush
 * on a microtask.
 *
 * **Hydration.** Pass the `state` from `HtmlServer.renderToHtml`, with the
 * server's HTML already in `container` and the same props, to adopt the
 * server's nodes instead of building them. Each instance adopts its server
 * Model and replays `init` only to recover its Commands; server Commands the
 * Model already has the result of are skipped, and those that missed the
 * budget run now. `onMount` fires on adoption. An instance whose view doesn't
 * match the server's nodes is rebuilt on its own, and one the server deferred
 * is built fresh.
 *
 * An instance whose provided Layer is still building keeps the server's
 * nodes until the Layer is ready, and everything else is live at once. A
 * waiting slot is inert: its buttons do nothing, links still navigate through
 * the Router, a `<form>` submits natively, and typed input is overwritten
 * when it adopts. `root.adopted` completes when no slot is waiting, and head
 * sync starts after it.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.3
 */
export const mount = <Name extends string, Props, Model, Msg, Events, R, V extends View.Elements, RF = never>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V> & HtmlRoot<V>,
  props: Props,
  container: globalThis.Element,
  options?: {
    readonly fallback?:
      | ((
        failure: AsyncResult.Failure<never, unknown>,
        h: View.Helper<never, {}> & View.Tags<V, never>
      ) => View.Node<never, RF>)
      | undefined
    readonly state?: Renderer.State | undefined
    readonly loader?: Renderer.LoaderOptions | undefined
  }
): Effect.Effect<Renderer.Root<Model, Msg>, never, Exclude<R | RF, Html.Host> | Scope.Scope> =>
  Effect.gen(function*() {
    const context = yield* Layer.build(layer({ document: container.ownerDocument }))
    return yield* Effect.provideContext(Renderer.mount(component, props, container, options), context)
  }) as any
