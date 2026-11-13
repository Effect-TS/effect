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
 * A `dialog` set with `modal(true)` is shown with `showModal()` at the commit
 * after it's in the document, and closed with `close()`. Dialogs shown in
 * the same commit open in document order, so one nested in another is on
 * top; one shown later is on top of those already open. The host cancels a
 * modal's `cancel` and sends it to `onCancel`, so the Model decides. When
 * the browser closes it anyway, as Chromium does after repeated cancelled
 * requests, the host shows it again on the next frame while the Model still
 * wants it, which moves focus to its first focusable element. Browsers
 * report each close a task later, so the host keeps one record per time it
 * showed the dialog, and each `close` event ends the oldest: it reaches
 * `onClose` only for the latest showing, and not for a close the host made
 * itself. Before removing a dialog it showed that is still open, or an
 * element containing one, the host closes it, the latest shown first, so
 * focus goes back to where it was before each one opened, as it does when
 * the Model closes them. That close isn't the app's either.
 *
 * A popover's `popoverOpen` is shown with `showPopover()` at the commit,
 * after the modal dialogs, since a modal opening closes the auto popovers
 * already showing, and hidden with `hidePopover()`. A `"manual"` popover is
 * applied at every commit, including when its component didn't render, since
 * a move in the document closes it without a `toggle`, and put back on the
 * frame after any other change;
 * an `"auto"` one is applied only when the Model's value or the mode
 * changes, and the browser's changes are left for the Model to follow.
 * Every `toggle` is sent, including a coalesced one whose states are equal,
 * since it may be the only report of a change.
 *
 * A handler set with `{ preventDefault: true }` cancels its event's default
 * when it produces a message, before the message is sent, and leaves the
 * event alone when it returns `undefined`. Nothing else is cancelled, and the
 * host never stops an event's propagation: the delegated listeners run on the
 * document in the capture phase, so stopping it there would hide the event
 * from the target and from every other listener. A cancelled click on a
 * routed link isn't followed by `BrowserRouter`. `wheel`, `touchstart` and
 * `touchmove` aren't in the vocabulary, since browsers make document listeners
 * for them passive.
 *
 * The host does the drag and drop work a handler can't. On `dragstart` it puts
 * the innermost drag source's `draggable` data on the drag. While a drag is
 * over the app it works out the active drop target, the innermost element
 * whose `onDrop` accepts the drag's types, on every `dragenter` and
 * `dragover`, cancels those events there so the browser allows the drop, and
 * sends the target's enter and leave when it changes, never for its
 * children. A drag that leaves the window, or is cancelled, leaves the
 * target: a `dragleave` from the latest `dragenter`'s element with no enter
 * by the next task means the pointer left, whichever order the browser fires
 * them in. `onDragOver` is sent at most once per animation frame. A drop on a
 * target is always cancelled, and its strings and files are read then.
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
 * import { Layer, Schema } from "effect"
 * import { Component } from "effect/ui"
 *
 * const Message = Schema.TaggedUnion({ Increment: {} })
 *
 * const Counter = Component.define({
 *   name: "Counter",
 *   model: Schema.Number,
 *   message: Message,
 *   elements: Html
 * }).make({
 *   init: () => 0,
 *   update: (count) => count + 1,
 *   view: (count, h) => h.button.onClick(Message.make({ _tag: "Increment" })).children(String(count))
 * })
 *
 * // The tree is mounted for as long as the Layer is built.
 * const main = Layer.launch(BrowserHost.mount(Counter, {}, document.getElementById("app")!))
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Context from "../../Context.ts"
import * as Effect from "../../Effect.ts"
import * as Layer from "../../Layer.ts"
import type * as AsyncResult from "../../reactivity/AsyncResult.ts"
import * as Loader from "../../reactivity/Loader.ts"
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

const isDialog = (node: globalThis.Node): node is HTMLDialogElement =>
  node.nodeType === 1 && (node as globalThis.Element).localName === "dialog"

/** The drop target's events, which go to the active drop target and never bubble to a handler. */
const dropTargetEvents: ReadonlySet<string> = new Set(["dragenter", "dragleave", "dragover", "drop"])

/** The events a drag source needs whether or not it has handlers for them. */
const dragSourceEvents: ReadonlyArray<string> = ["dragstart", "dragend"]

/** Events the host listens to whether or not a handler wants them. */
const alwaysEvents: ReadonlyArray<string> = [...changeEvents, "submit"]

const controlled: ReadonlySet<string> = new Set(["value", "checked", "selected", "open", "popoverOpen"])

const emptyValue = (name: string): unknown => name === "value" ? "" : false

interface Bound {
  readonly handlers: Readonly<Record<string, View.Handler<unknown, any>>>
  readonly dispatch: Renderer.Dispatch
  readonly options: Readonly<Record<string, View.EventOptions>>
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
    case "keyup": {
      const e = event as KeyboardEvent
      // Safari reports the key that ends a composition with `isComposing` false and `keyCode` 229.
      const composing = e.isComposing === true || (e as { readonly keyCode?: number }).keyCode === 229
      return { key: e.key ?? "", ...modifiers(event), composing }
    }
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
    case "toggle": {
      const e = event as Partial<ToggleEvent>
      // A popover's state is its own; a `details` or `dialog` reads `open`, with states derived where the
      // browser has no `ToggleEvent`.
      const open = element.hasAttribute("popover")
        ? e.newState === "open"
        : (element as HTMLDetailsElement).open === true
      const newState = e.newState === "open" || e.newState === "closed" ? e.newState : open ? "open" : "closed"
      const oldState = e.oldState === "open" || e.oldState === "closed"
        ? e.oldState
        : newState === "open"
        ? "closed"
        : "open"
      return { open, newState, oldState }
    }
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
 * @since 4.1.5
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

  // -- dialogs -----------------------------------------------------------------
  // A dialog's `open` is `false`, `true` or `"modal"`. `showModal()` needs a connected dialog, so a modal
  // is shown at the commit. Closing always goes through `close()`: setting `open` to false on a modal
  // dialog leaves the page inert in browsers.
  /** Dialogs the host showed with `showModal()` and hasn't seen close since. */
  const modals = new WeakSet<globalThis.Element>()
  /**
   * Each time a dialog was shown, oldest first, until its `close` event arrives. Browsers report every
   * close in a later task, so several can be queued: each event ends the oldest showing, and only the
   * close of the latest showing, not made by the host to change mode or before a removal, is the app's.
   */
  const showings = new WeakMap<globalThis.Element, Array<{ byHost: boolean; closed: boolean }>>()
  const showingsOf = (dialog: globalThis.Element) => {
    let list = showings.get(dialog)
    if (list === undefined) {
      list = []
      showings.set(dialog, list)
    }
    return list
  }
  /** Dialogs whose Model says `"modal"`, checked at every commit. */
  const modalWanted = new Set<HTMLDialogElement>()
  /**
   * Dialogs with a showing the host recorded, in the order they were shown, closed before a removal takes
   * them out. Pruned at commit.
   */
  const shown = new Set<HTMLDialogElement>()
  /**
   * Whether `:modal` works here, found on the first `showModal()`. Where it does, a dialog the host
   * showed but the browser no longer has as modal, such as one moved in the document, is shown again.
   * Some emulated documents claim the selector and never match it, so it's tested, not asked.
   */
  let modalPseudo: boolean | undefined
  const matchesModal = (dialog: HTMLDialogElement): boolean => {
    try {
      return dialog.matches(":modal")
    } catch {
      return false
    }
  }

  const shownAs = (dialog: HTMLDialogElement): boolean | "modal" =>
    !dialog.open
      ? false
      : modals.has(dialog) && (modalPseudo !== true || matchesModal(dialog))
      ? "modal"
      : true

  /**
   * Records the showing of an open dialog that has none, such as a server-rendered `open` adopted by
   * hydration, so the close that ends it, the host's or the browser's, is attributed to it. A dialog
   * whose latest record is still open already has one, so repeated reconciliation adds nothing.
   */
  const adoptShowing = (dialog: HTMLDialogElement) => {
    if (!dialog.open) return
    const list = showingsOf(dialog)
    const latest = list.at(-1)
    if (latest === undefined || latest.closed) list.push({ byHost: false, closed: false })
    shown.add(dialog)
  }

  const closeDialog = (dialog: HTMLDialogElement, byHost: boolean) => {
    if (!dialog.open) return
    modals.delete(dialog)
    adoptShowing(dialog)
    shown.delete(dialog)
    const current = showingsOf(dialog).at(-1)!
    current.closed = true
    current.byHost = byHost
    dialog.close()
  }

  /**
   * Closes the open dialogs the host showed that are `node` or inside it, before it's removed. Once it's
   * out of the document, `close()` would leave focus on the body. The latest shown closes first, so each
   * one hands focus back to where it was when it opened, which may be in a dialog shown before it.
   */
  const closeShownIn = (node: globalThis.Node) => {
    for (const dialog of Array.from(shown).reverse()) {
      if (node.contains(dialog)) closeDialog(dialog, true)
    }
  }

  /** Shows `dialog` as `want` says, from what it shows now. The caller checks `modal` needs it connected. */
  const showDialog = (dialog: HTMLDialogElement, want: boolean | "modal") => {
    adoptShowing(dialog)
    const current = shownAs(dialog)
    if (current === want) return
    if (want === false) return closeDialog(dialog, false)
    // Between non-modal and modal the browser needs a close first. That close isn't the app's.
    if (current !== false) closeDialog(dialog, true)
    if (want === "modal") {
      dialog.showModal()
      modals.add(dialog)
      modalPseudo ??= matchesModal(dialog)
    } else {
      dialog.show()
    }
    showingsOf(dialog).push({ byHost: false, closed: false })
    shown.add(dialog)
  }

  // -- popovers ----------------------------------------------------------------
  // A popover's `popoverOpen` is separate from `open`. A manual popover is applied at every commit and put
  // back after any other change; an auto popover is applied only when the Model's value or the mode
  // changes, and the browser's changes are left for the Model to follow. `showPopover()` needs a connected
  // element with the attribute, so a popover is shown at the commit, after the modal dialogs: a modal
  // opening closes the auto popovers already showing.
  /** Popovers whose Model says open, shown at the next commit. */
  const popoversToShow = new Set<HTMLElement>()
  /**
   * Manual popovers, reconciled at every commit whether or not they rendered: moving an element, as a
   * keyed reorder of an ancestor does, closes its popover without a `toggle`. One that has left the
   * document is dropped.
   */
  const manualPopovers = new Set<HTMLElement>()
  /** The mode each popover's state was last applied under. */
  const popoverModes = new WeakMap<globalThis.Node, string | null>()

  const popoverShowing = (element: HTMLElement): boolean => {
    try {
      return element.matches(":popover-open")
    } catch {
      return false
    }
  }

  /** Applies the Model's state: hiding at once, showing at the commit, or at once when `now` and it can. */
  const applyPopover = (element: HTMLElement, want: boolean, now = false) => {
    if (want) {
      if (!now) popoversToShow.add(element)
      else if (element.isConnected && element.hasAttribute("popover") && !popoverShowing(element)) {
        element.showPopover()
      }
      return
    }
    popoversToShow.delete(element)
    if (popoverShowing(element)) element.hidePopover()
  }

  /**
   * Shows the popovers queued for this commit and the manual popovers that should be showing, if they're
   * still connected and wanted, in document order, and hides the manual ones that shouldn't be.
   */
  const showPopovers = () => {
    for (const element of manualPopovers) {
      if (!element.isConnected) manualPopovers.delete(element)
      else if (wanted.get(element)?.get("popoverOpen") === true) popoversToShow.add(element)
      else if (popoverShowing(element)) element.hidePopover()
    }
    if (popoversToShow.size === 0) return
    const popovers = [...popoversToShow]
    popoversToShow.clear()
    popovers.sort((a, b) => (a.compareDocumentPosition(b) & 4) !== 0 ? -1 : 1)
    for (const element of popovers) {
      // One that left the document is forgotten; a render that brings it back queues it again.
      if (!element.isConnected || !element.hasAttribute("popover")) continue
      if (wanted.get(element)?.get("popoverOpen") !== true || popoverShowing(element)) continue
      element.showPopover()
    }
  }

  const restoreNode = (node: globalThis.Node) => {
    const values = wanted.get(node)
    if (values === undefined) return
    const element = node as any
    for (const [name, value] of values) {
      if (name === "open" && isDialog(node)) {
        // A dialog that left the document can't be shown; a later commit shows it if it comes back.
        if (node.isConnected) showDialog(node, value as boolean | "modal")
      } else if (name === "popoverOpen") {
        // Only a manual popover is put back. An auto popover's changes are the browser's, for the Model
        // to follow.
        if ((node as globalThis.Element).getAttribute("popover") === "manual") {
          applyPopover(node as HTMLElement, value === true, true)
        }
      } else if (element[name] !== value) element[name] = value
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

  // -- drag and drop ---------------------------------------------------------
  // The active drop target is the innermost element on the pointer's path whose `drop` options accept
  // the drag's types. It's worked out again on every `dragenter` and `dragover`, so its enter and leave
  // come from comparing targets, never from the browser's enter and leave on the target's children.
  let active: globalThis.Element | undefined
  /** The target of the latest `dragenter` anywhere in the document. */
  let entered: EventTarget | null = null
  let exitCheck: ReturnType<typeof setTimeout> | undefined
  /** Whether one of the app's drop targets took a drop since the last `dragstart`. */
  let droppedHere = false
  let overFrame: number | undefined
  let overQueued: Html.DragOverPayload | undefined
  let overSent: Html.DragOverPayload | undefined

  const frame = (f: () => void): number =>
    view !== null && typeof view.requestAnimationFrame === "function"
      ? view.requestAnimationFrame(f)
      : setTimeout(f, 0) as unknown as number
  const cancelFrame = (id: number) => {
    if (view !== null && typeof view.cancelAnimationFrame === "function") view.cancelAnimationFrame(id)
    else clearTimeout(id)
  }

  const typesOf = (event: Event): ReadonlyArray<string> =>
    Array.from((event as DragEvent).dataTransfer?.types ?? [], (type) => type.toLowerCase())

  /** Whether `node` is, as bound now, a drop target that accepts a drag of `types`. */
  const accepts = (node: globalThis.Node, types: ReadonlyArray<string>): boolean => {
    const entry = bound.get(node)
    if (entry === undefined || entry.handlers.drop === undefined) return false
    const accepted = (entry.options.drop as Html.DropTargetOptions | undefined)?.accepts
    return accepted?.some((type) => types.includes(type.toLowerCase())) === true
  }

  const dropTargetOf = (event: Event): globalThis.Element | undefined => {
    const types = typesOf(event)
    if (types.length === 0) return undefined
    for (const node of event.composedPath()) {
      if (accepts(node as globalThis.Node, types)) return node as globalThis.Element
    }
    return undefined
  }

  const boxOf = (event: Event, element: globalThis.Element): Html.DragOverPayload => {
    const rect = element.getBoundingClientRect()
    const e = event as MouseEvent
    return { x: (e.clientX ?? 0) - rect.left, y: (e.clientY ?? 0) - rect.top, width: rect.width, height: rect.height }
  }

  /** Sends `name` to `element`'s own handler, if it has one. */
  const sendTo = (element: globalThis.Element, name: string, payload: unknown) => {
    const entry = bound.get(element)
    const handler = entry?.handlers[name]
    if (entry !== undefined && handler !== undefined) entry.dispatch(name, handler, payload)
  }

  const cancelOver = () => {
    if (overFrame !== undefined) cancelFrame(overFrame)
    overFrame = undefined
    overQueued = undefined
  }

  /** Makes `next` the active drop target: the previous one leaves, then `next` enters. */
  const activate = (next: globalThis.Element | undefined) => {
    if (next === active) return
    const previous = active
    active = next
    // A queued position belongs to the previous target.
    cancelOver()
    overSent = undefined
    if (previous !== undefined) sendTo(previous, "dragleave", {})
    if (next !== undefined) sendTo(next, "dragenter", {})
  }

  const cancelExitCheck = () => {
    if (exitCheck !== undefined) clearTimeout(exitCheck)
    exitCheck = undefined
  }

  /** Ends the drag for the drop targets: the active one leaves, and nothing stays queued. */
  const endTargets = () => {
    cancelExitCheck()
    entered = null
    activate(undefined)
  }

  /** Queues the active target's `dragover` for the next frame, unless its position is what it last got. */
  const queueOver = (element: globalThis.Element, payload: Html.DragOverPayload, types: ReadonlyArray<string>) => {
    if (bound.get(element)?.handlers.dragover === undefined) return
    overQueued = payload
    if (overFrame !== undefined) return
    overFrame = frame(() => {
      overFrame = undefined
      const next = overQueued
      overQueued = undefined
      // A render since the event may have taken the element's `onDrop` away or changed what it accepts.
      if (next === undefined || active !== element || !element.isConnected || !accepts(element, types)) return
      if (
        overSent !== undefined && overSent.x === next.x && overSent.y === next.y && overSent.width === next.width &&
        overSent.height === next.height
      ) return
      overSent = next
      sendTo(element, "dragover", next)
    })
  }

  const onDropTarget = (name: string, event: DragEvent) => {
    switch (name) {
      case "dragenter":
      case "dragover": {
        // Any enter or over means the pointer is still in the document.
        cancelExitCheck()
        if (name === "dragenter") entered = event.target
        const target = dropTargetOf(event)
        if (target !== undefined) {
          event.preventDefault()
          const dropEffect = (bound.get(target)!.options.drop as Html.DropTargetOptions).dropEffect
          if (dropEffect !== undefined && event.dataTransfer !== null) event.dataTransfer.dropEffect = dropEffect
        }
        activate(target)
        if (name === "dragover" && target !== undefined) queueOver(target, boxOf(event, target), typesOf(event))
        return
      }
      case "dragleave": {
        // A browser fires the leave of the element the pointer left and the enter of the one it reached
        // in the same task, in either order. A leave from the latest enter's target with no enter after it
        // by the next task means the pointer left the document, or the drag was cancelled.
        if (event.target !== entered) return
        cancelExitCheck()
        exitCheck = setTimeout(() => {
          exitCheck = undefined
          endTargets()
        }, 0)
        return
      }
      case "drop": {
        const target = dropTargetOf(event)
        if (target === undefined) {
          endTargets()
          return
        }
        event.preventDefault()
        droppedHere = true
        const transfer = event.dataTransfer
        // No prototype, so a type named `constructor` is kept like any other.
        const data: Record<string, string> = Object.create(null)
        for (const type of transfer?.types ?? []) {
          if (type !== "Files") data[type] = transfer!.getData(type)
        }
        const files = Array.from(transfer?.files ?? [])
        const payload: Html.DropPayload = { data, files, ...boxOf(event, target) }
        sendTo(target, "drop", payload)
        endTargets()
        return
      }
    }
  }

  /** Puts the innermost drag source's data on the drag. */
  const startDrag = (event: DragEvent) => {
    droppedHere = false
    const transfer = event.dataTransfer
    if (transfer === null) return
    for (const node of event.composedPath()) {
      const source = bound.get(node as globalThis.Node)?.options.dragstart as Html.DragSourceOptions | undefined
      if (source?.data === undefined) continue
      for (const type in source.data) transfer.setData(type, source.data[type]!)
      if (source.effectAllowed !== undefined) transfer.effectAllowed = source.effectAllowed
      return
    }
  }

  const listener = (name: string) => (event: Event) => {
    if (dropTargetEvents.has(name)) return onDropTarget(name, event as DragEvent)
    if ((name === "cancel" || name === "close") && event.target !== null && isDialog(event.target as globalThis.Node)) {
      const dialog = event.target as HTMLDialogElement
      if (name === "cancel") {
        // A modal's close request is the Model's to answer, through `onCancel`. A browser can make the
        // event uncancelable; the close that follows is then put back by the reconciliation below.
        if (wanted.get(dialog)?.get("open") === "modal") event.preventDefault()
      } else {
        // `close` comes a task after the close, and ends the oldest showing. The host's own close isn't
        // the app's, and neither is the close of a showing the dialog has been shown again since.
        const list = showings.get(dialog)
        const ended = list?.shift()
        if (ended !== undefined && (ended.byHost || list!.length > 0)) return
        if (!dialog.open) modals.delete(dialog)
      }
    }
    if (name === "dragstart") startDrag(event as DragEvent)
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
        const preventDefault = entry.options[name]?.preventDefault
        if (preventDefault === "always") event.preventDefault()
        entry.dispatch(
          name,
          handler,
          name === "dragend"
            ? dragEndPayload(event as DragEvent)
            : payloadOf(name, event, event.target, node as globalThis.Element),
          preventDefault === true ? () => event.preventDefault() : undefined
        )
        break
      }
      if (own) break
    }
    if (changeEvents.includes(name)) restoreSoon(event.target)
    if (name === "dragend") endTargets()
  }

  const dragEndPayload = (event: DragEvent): Html.DragEndPayload => ({
    // The app saw its own drops. Elsewhere, browsers report a drop with the effect it had, though not
    // every browser does so reliably.
    dropped: droppedHere || (event.dataTransfer !== null && event.dataTransfer.dropEffect !== "none")
  })

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
      if (name === "popoverOpen") {
        const want = value === true
        let values = wanted.get(node)
        if (values === undefined) {
          values = new Map()
          wanted.set(node, values)
        }
        const previous = values.get(name)
        values.set(name, want)
        const mode = (node as globalThis.Element).getAttribute("popover")
        const modeChanged = popoverModes.get(node) !== mode
        popoverModes.set(node, mode)
        if (mode === "manual") manualPopovers.add(node as HTMLElement)
        else manualPopovers.delete(node as HTMLElement)
        // Edge-triggered: an auto popover the browser closed stays closed until the Model's value changes.
        if (mode === "auto" && !modeChanged && previous === want) return
        applyPopover(node as HTMLElement, want)
        return
      }
      if (name === "open" && isDialog(node)) {
        const want = value === "modal" ? "modal" : value === true
        let values = wanted.get(node)
        if (values === undefined) {
          values = new Map()
          wanted.set(node, values)
        }
        values.set(name, want)
        if (want === "modal") {
          // Shown at the commit, once it's connected, outer dialogs first.
          modalWanted.add(node)
          listen("cancel")
          return
        }
        modalWanted.delete(node)
        showDialog(node, want)
        return
      }
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
      if (shown.size > 0) closeShownIn(node)
      node.parentNode?.removeChild(node)
    },
    parentOf: (node) => node.parentNode ?? undefined,
    nextOf: (node) => node.nextSibling ?? undefined,
    setEvents(node, handlers, dispatch, options) {
      bound.set(node, { handlers, dispatch, options })
      for (const name in handlers) listen(name)
      // A drag source needs its `dragstart` without a handler, and a drop target all of its events.
      if (options.dragstart !== undefined) { for (const name of dragSourceEvents) listen(name) }
      // `dragend` ends an in-app drag for the targets too. Whoever reads `dropped` needs `dragstart`, which
      // resets it, even for a native drag source such as a link with only `onDragEnd`.
      if (handlers.drop !== undefined) { for (const name of [...dropTargetEvents, ...dragSourceEvents]) listen(name) }
      if (handlers.dragend !== undefined) { for (const name of dragSourceEvents) listen(name) }
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
    commit() {
      for (const dialog of shown) {
        if (!dialog.open || !dialog.isConnected) shown.delete(dialog)
      }
      if (modalWanted.size === 0) return showPopovers()
      const dialogs: Array<HTMLDialogElement> = []
      for (const dialog of modalWanted) {
        // A dialog that left the tree for good is forgotten. One that's back is shown again.
        if (!dialog.isConnected) modalWanted.delete(dialog)
        else dialogs.push(dialog)
      }
      // Document order: a dialog opens before one nested in it or after it, which then stacks on top.
      dialogs.sort((a, b) => (a.compareDocumentPosition(b) & 4) !== 0 ? -1 : 1)
      for (const dialog of dialogs) showDialog(dialog, "modal")
      showPopovers()
    },
    dispose: () => {
      for (const [name, f] of listening) document.removeEventListener(name, f, { capture: true })
      listening.clear()
      cancelExitCheck()
      cancelOver()
      active = undefined
    }
  }
}

/**
 * The element operations behind `Html.focus`, `blur`, `scrollIntoView` and
 * `measure`, on DOM elements.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
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

// Visibility follows `visibilitychange` only, never the window's `focus`. Connectivity
// starts true and follows `online` and `offline` on the document's own window.
const signals = (document: Document) => {
  const visibility = Loader.makeSignal(document.visibilityState !== "hidden")
  const connectivity = Loader.makeSignal(true)
  const view = document.defaultView
  const onVisibility = () => visibility.set(document.visibilityState !== "hidden")
  const onOnline = () => connectivity.set(true)
  const onOffline = () => connectivity.set(false)
  document.addEventListener("visibilitychange", onVisibility)
  view?.addEventListener("online", onOnline)
  view?.addEventListener("offline", onOffline)
  return {
    visibility,
    connectivity,
    dispose: () => {
      document.removeEventListener("visibilitychange", onVisibility)
      view?.removeEventListener("online", onOnline)
      view?.removeEventListener("offline", onOffline)
    }
  }
}

/**
 * Provides the DOM host as the `Renderer`, `Html.Host`, and the document's
 * `Loader.Visibility` and `Loader.Connectivity`, for the life of the Layer.
 *
 * **Details**
 *
 * `document` defaults to the global `document`. Closing the Layer removes the
 * host's listeners. The signals use the document and its `defaultView`,
 * never globals.
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const layer = (options?: {
  readonly document?: Document | undefined
}): Layer.Layer<Renderer.Renderer | Html.Host> =>
  Layer.effectContext(Effect.gen(function*() {
    const document = options?.document ?? globalThis.document
    const host = makeHost(document)
    yield* Effect.addFinalizer(() => Effect.sync(host.dispose))
    const signal = signals(document)
    yield* Effect.addFinalizer(() => Effect.sync(signal.dispose))
    return Context.make(Renderer.Renderer, { host }).pipe(
      Context.add(Html.Host, htmlHost),
      Context.add(Loader.Visibility, signal.visibility),
      Context.add(Loader.Connectivity, signal.connectivity)
    )
  }))

/**
 * Passes when a root shows HTML or is host-neutral, and otherwise names the
 * host its vocabulary needs.
 *
 * @stability experimental
 * @category utility types
 * @since 4.1.5
 */
export type HtmlRoot<V> = [Renderer.HostOf<V>] extends [Html.Host] ? unknown
  : { readonly "BrowserHost.mount shows HTML elements. This root's vocabulary needs": Renderer.HostOf<V> }

/**
 * The options of `mount` and `mountEffect`.
 *
 * @stability experimental
 * @category models
 * @since 4.1.5
 */
export interface MountOptions<V extends View.Elements, RF = never> {
  /** Shown in the root's place when the root itself fails. */
  readonly fallback?:
    | ((
      failure: AsyncResult.Failure<never, unknown>,
      h: View.Helper<never, {}> & View.Tags<V, never>
    ) => View.Content<never, RF>)
    | undefined
  /** The `state` of `HtmlServer.renderToHtml`, to hydrate the server's HTML. */
  readonly state?: Renderer.State | undefined
  readonly loader?: Renderer.LoaderOptions | undefined
}

/**
 * A Layer that mounts a component tree into `container` for as long as the
 * Layer is built. It provides no service: launch it with `Layer.launch`, or
 * merge it into the app's Layer.
 *
 * **When to use**
 *
 * Use to run an app. Reach for `mountEffect` when the caller needs the root,
 * to send it messages or to wait for `root.adopted`.
 *
 * **Details**
 *
 * The root must render HTML (or be host-neutral): mounting a root of another
 * vocabulary is a type error. Nested components are checked when they mount,
 * and one of another vocabulary fails its own slot. The tree's requirements
 * are the root's, minus `Html.Host`, which the host provides. When the root
 * itself fails, `fallback` is shown in its place.
 *
 * `props` may be an Effect, such as `Router.props(AppRoute)`. It runs once,
 * before `init`, and its requirements are added to the mount's, so a routed
 * app needs only this Layer and its Router's. A root's props therefore can't
 * themselves be an Effect.
 *
 * Commands and Subscriptions run on the default scheduler, the render flush
 * on a microtask. A navigation Command runs in the flush its `update` caused,
 * which renders the new route.
 *
 * **Hydration.** Pass the `state` from `HtmlServer.renderToHtml`, with the
 * server's HTML already in `container` and the same props, to adopt the
 * server's nodes instead of building them. `Router.props` gives the same
 * props on both sides when both Routers are at the same URL. Each instance adopts its server
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
 * when it adopts. Head sync starts once no slot is waiting.
 *
 * **Example** (Launching an app)
 *
 * ```ts
 * import { BrowserHost, Html } from "effect/ui/html"
 * import { Effect, Layer, Schema } from "effect"
 * import { Component } from "effect/ui"
 *
 * const App = Component.define({
 *   name: "App",
 *   model: Schema.Struct({}),
 *   message: Schema.Never,
 *   elements: Html
 * }).make({
 *   init: () => ({}),
 *   update: (model) => model,
 *   view: (_, h) => h.h1("Hello")
 * })
 *
 * // In the browser entry module.
 * Effect.runFork(Layer.launch(BrowserHost.mount(App, {}, document.getElementById("app")!)))
 * ```
 *
 * @stability experimental
 * @category layers
 * @since 4.1.5
 */
export const mount = <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
  RF = never,
  RP = never,
  Rcv = never
>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V, any, Rcv> & HtmlRoot<V>,
  props: Props | Effect.Effect<Props, never, RP>,
  container: globalThis.Element,
  options?: MountOptions<V, RF>
): Layer.Layer<never, never, Exclude<R | RF | RP, Html.Host>> =>
  Layer.effectDiscard(mountEffect(component, props, container, options)) as any

/**
 * Mounts a component tree into `container` for the life of the current
 * Scope, and returns its root.
 *
 * **When to use**
 *
 * Use when the caller needs the root: to read its Model, send it a message,
 * or wait for `root.adopted`, which completes when no hydrating slot is still
 * waiting. `mount` is the form that runs an app.
 *
 * **Details**
 *
 * It mounts, checks the root and hydrates exactly as `mount` does.
 *
 * @stability experimental
 * @category constructors
 * @since 4.1.5
 */
export const mountEffect = <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
  RF = never,
  RP = never,
  Rcv = never
>(
  component: Component.Component<Name, Props, Model, Msg, Events, R, V, any, Rcv> & HtmlRoot<V>,
  props: Props | Effect.Effect<Props, never, RP>,
  container: globalThis.Element,
  options?: MountOptions<V, RF>
): Effect.Effect<Renderer.Root<Model, Msg>, never, Exclude<R | RF | RP, Html.Host> | Scope.Scope> =>
  Effect.gen(function*() {
    const context = yield* Layer.build(layer({ document: container.ownerDocument }))
    return yield* Effect.provideContext(Renderer.mount(component, props, container, options), context)
  }) as any
