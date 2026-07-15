/**
 * Internal machine representation helpers.
 *
 * @since 4.0.0
 */

import * as Cause from "../../../Cause.ts"
import * as Effect from "../../../Effect.ts"
import * as Option from "../../../Option.ts"
import { hasProperty } from "../../../Predicate.ts"
import * as Schema from "../../../Schema.ts"
import type { Machine } from "../Machine.ts"
import { MachineSchemaDecodeError } from "./machineErrors.ts"

export const TargetTypeId = "~effect/Machine/Target"

export const getSchemaTag = (schema: Machine.TaggedSchema): PropertyKey | undefined => {
  const tag = (schema as any).fields?._tag?.schema?.literal ?? (schema as any).fields?._tag?.ast?.literal
  return typeof tag === "string" || typeof tag === "number" || typeof tag === "symbol" ? tag : undefined
}

export const getStateNodeDefinition = (
  path: string,
  definition: Machine.TaggedSchema | Machine.StateNodeConfig
): {
  readonly schema: Machine.TaggedSchema
  readonly output: Schema.Top | undefined
  readonly type: "atomic" | "compound" | "parallel" | "final"
  readonly initial: string | undefined
  readonly states: Machine.StateTree | undefined
} => {
  if (Schema.isSchema(definition)) {
    return {
      schema: definition as Machine.TaggedSchema,
      output: undefined,
      type: "atomic",
      initial: undefined,
      states: undefined
    }
  }
  if (!hasProperty(definition, "schema") || !Schema.isSchema(definition.schema)) {
    throw new Error(`Machine.make expected state "${path}" to be a tagged schema or state node config`)
  }
  if ((definition as any).type === "parallel" && !hasProperty(definition, "states")) {
    throw new Error(`Machine.make expected parallel state "${path}" to declare child regions`)
  }
  if (hasProperty(definition, "states")) {
    if ((definition as any).type === "final") {
      throw new Error(`Machine.make expected compound state "${path}" to be active`)
    }
    if ((definition as any).type === "parallel") {
      return {
        schema: definition.schema as Machine.TaggedSchema,
        output: Schema.isSchema((definition as any).output) ? (definition as any).output as Schema.Top : undefined,
        type: "parallel",
        initial: undefined,
        states: (definition as any).states as Machine.StateTree
      }
    }
    if (typeof (definition as any).initial !== "string") {
      throw new Error(`Machine.make expected compound state "${path}" to declare an initial child`)
    }
    return {
      schema: definition.schema as Machine.TaggedSchema,
      output: undefined,
      type: "compound",
      initial: (definition as any).initial,
      states: (definition as any).states as Machine.StateTree
    }
  }
  return {
    schema: definition.schema as Machine.TaggedSchema,
    output: Schema.isSchema((definition as any).output) ? (definition as any).output as Schema.Top : undefined,
    type: definition.type === "final" ? "final" : "atomic",
    initial: undefined,
    states: undefined
  }
}

export const compileStateNodes = (states: Machine.StateSchemas): Machine.StateNodes => {
  const byPath = new Map<string, Machine.StateNode>()
  let order = 0

  const compile = (tree: Machine.StateTree, parent: string | undefined): ReadonlyArray<string> => {
    const paths: Array<string> = []
    for (const key of Object.keys(tree)) {
      if (key.includes(".")) {
        throw new Error(`Machine state keys cannot contain ".": "${key}"`)
      }
      const path = parent === undefined ? key : `${parent}.${key}`
      const definition = getStateNodeDefinition(path, tree[key])
      const node = {
        path,
        key,
        tag: getSchemaTag(definition.schema) ?? key,
        schema: definition.schema,
        output: definition.output,
        type: definition.type,
        parent,
        children: [] as ReadonlyArray<string>,
        initial: definition.initial === undefined ? undefined : `${path}.${definition.initial}`,
        order
      }
      byPath.set(path, node)
      paths.push(path)
      order += 1
      if (definition.states !== undefined) {
        const children = compile(definition.states, path)
        if (node.type === "compound" && (node.initial === undefined || !children.includes(node.initial))) {
          throw new Error(`Machine.make expected compound state "${path}" initial child to exist`)
        }
        ;(node as { children: ReadonlyArray<string> }).children = children
      }
    }
    return paths
  }

  return {
    byPath,
    roots: compile(states, undefined)
  }
}

export const makeTarget = <
  const States extends Machine.StateSchemas,
  const StateId extends Machine.StateIdentifier<States>
>(
  path: StateId,
  value: Machine.StateByIdentifier<States, StateId>,
  options?: {
    readonly values?: Partial<
      {
        readonly [AncestorStateId in Machine.StateIdentifier<States>]: Machine.StateByIdentifier<
          States,
          AncestorStateId
        >
      }
    >
  }
): Machine.Target<States, StateId> =>
  ({
    [TargetTypeId]: TargetTypeId,
    path,
    value,
    values: options?.values
  }) as Machine.Target<States, StateId>

export const isTarget = (u: unknown): u is Machine.Target<any, any> => hasProperty(u, TargetTypeId)

export const isSnapshot = (u: unknown): u is Machine.AtomicSnapshot<string, unknown> =>
  hasProperty(u, "path") && hasProperty(u, "value")

export interface ActiveConfiguration {
  readonly active: ReadonlySet<string>
  readonly values: ReadonlyMap<string, unknown>
  readonly outputs: ReadonlyMap<string, unknown>
}

export interface FinalCompletion {
  readonly path: string
  readonly output: unknown
}

export interface DecodeBoundaryOptions {
  readonly boundary: "input" | "event" | "emit" | "state" | "output" | "configuration"
  readonly state?: string
  readonly event?: string
}

interface CompletionResult extends FinalCompletion {
  readonly isNew: boolean
}

export const getEventName = (event: unknown): string | undefined =>
  hasProperty(event, "_tag") ? String(event._tag) : undefined

export const decodeBoundary = Effect.fnUntraced(function*<A>(
  machine: Machine.Any,
  schema: Schema.Top,
  value: unknown,
  options: DecodeBoundaryOptions
) {
  return yield* Schema.decodeUnknownEffect(Schema.toType(schema))(value).pipe(
    Effect.mapError((cause) =>
      new MachineSchemaDecodeError({
        machineId: machine.id,
        boundary: options.boundary,
        cause,
        ...(options.state === undefined ? {} : { state: options.state }),
        ...(options.event === undefined ? {} : { event: options.event })
      })
    )
  ) as Effect.Effect<A, MachineSchemaDecodeError>
})

export const decodeInput = <Input extends Schema.Top>(
  machine: Machine.Any,
  schema: Input,
  value: unknown
): Effect.Effect<Input["Type"], MachineSchemaDecodeError> =>
  decodeBoundary<Input["Type"]>(machine, schema, value, { boundary: "input" })

export const decodeEvent = <const Events extends ReadonlyArray<Machine.TaggedSchema>>(
  machine: Machine.Any,
  event: unknown
): Effect.Effect<Machine.EventOf<Events>, MachineSchemaDecodeError> => {
  const eventName = getEventName(event)
  return decodeBoundary<Machine.EventOf<Events>>(
    machine,
    Schema.Union(machine.events as ReadonlyArray<Schema.Top>),
    event,
    eventName === undefined ? { boundary: "event" } : { boundary: "event", event: eventName }
  )
}

export const decodeEmit = <const Emits extends ReadonlyArray<Machine.TaggedSchema>>(
  machine: Machine.Any,
  event: unknown
): Effect.Effect<Machine.EmitOf<Emits>, MachineSchemaDecodeError> => {
  const eventName = getEventName(event)
  return decodeBoundary<Machine.EmitOf<Emits>>(
    machine,
    Schema.Union(machine.emits as ReadonlyArray<Schema.Top>),
    event,
    eventName === undefined ? { boundary: "emit" } : { boundary: "emit", event: eventName }
  )
}

export const decodeStateValue = (
  machine: Machine.Any,
  node: Machine.StateNode,
  value: unknown
): Effect.Effect<unknown, MachineSchemaDecodeError> =>
  decodeBoundary(machine, node.schema, value, { boundary: "state", state: node.path })

export const decodeOutputValue = (
  machine: Machine.Any,
  node: Machine.StateNode,
  value: unknown
): Effect.Effect<unknown, MachineSchemaDecodeError> =>
  node.output === undefined
    ? Effect.succeed(value)
    : decodeBoundary(machine, node.output, value, { boundary: "output", state: node.path })

export const getNode = (machine: Machine.Any, path: string): Machine.StateNode => {
  const node = machine.stateNodes.byPath.get(path)
  if (node === undefined) {
    throw new Error(`Machine expected state path "${path}" to exist`)
  }
  return node
}

export const hasOwn = (u: object, key: string): boolean => Object.prototype.hasOwnProperty.call(u, key)

export const isDescendantOf = (path: string, ancestor: string): boolean => path.startsWith(`${ancestor}.`)

export const isPathInSubtree = (path: string, ancestor: string): boolean =>
  path === ancestor || isDescendantOf(path, ancestor)

export const getPathToRoot = (machine: Machine.Any, path: string): ReadonlyArray<string> => {
  const paths: Array<string> = []
  let current: string | undefined = path
  while (current !== undefined) {
    paths.unshift(current)
    current = getNode(machine, current).parent
  }
  return paths
}

export const pathDepth = (machine: Machine.Any, path: string): number => getPathToRoot(machine, path).length

export const compareDocumentOrder = (machine: Machine.Any, left: string, right: string): number =>
  getNode(machine, left).order - getNode(machine, right).order

export const hasActiveChild = (machine: Machine.Any, configuration: ActiveConfiguration, path: string): boolean =>
  getNode(machine, path).children.some((child) => configuration.active.has(child))

export const getActiveLeafPaths = (machine: Machine.Any, configuration: ActiveConfiguration): ReadonlyArray<string> => {
  const leaves = Array.from(configuration.active)
    .filter((path) => !hasActiveChild(machine, configuration, path))
    .sort((left, right) => compareDocumentOrder(machine, left, right))
  if (leaves.length === 0) {
    throw new Error("Machine expected an active leaf state")
  }
  return leaves
}

export const getLeafPath = (machine: Machine.Any, configuration: ActiveConfiguration): string =>
  getActiveLeafPaths(
    machine,
    configuration
  )[0]

export const getActiveLeafPathFrom = (
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string
): string => {
  const leaves = getActiveLeafPaths(machine, configuration)
    .filter((leaf) => isPathInSubtree(leaf, path))
  if (leaves.length === 0) {
    throw new Error(`Machine expected state "${path}" to have an active leaf state`)
  }
  return leaves[0]
}

export const getRootPath = (machine: Machine.Any, configuration: ActiveConfiguration): string => {
  for (const path of configuration.active) {
    if (getNode(machine, path).parent === undefined) {
      return path
    }
  }
  throw new Error("Machine expected an active root state")
}

export const getActiveValue = (configuration: ActiveConfiguration, path: string): unknown => {
  if (!configuration.values.has(path)) {
    throw new Error(`Machine expected active state "${path}" to have a value`)
  }
  return configuration.values.get(path)
}

export const getInitialEntryPaths = (
  machine: Machine.Any,
  configuration: ActiveConfiguration
): ReadonlyArray<string> => {
  const visit = (path: string): ReadonlyArray<string> => {
    if (!configuration.active.has(path)) {
      return []
    }
    const node = getNode(machine, path)
    return [
      path,
      ...node.children.flatMap(visit)
    ]
  }
  return machine.stateNodes.roots.flatMap(visit)
}

export const snapshotFromPath = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string
): Machine.SnapshotByIdentifier<States, Machine.StateIdentifier<States>> => {
  const node = getNode(machine, path)
  const snapshot: Record<string, unknown> = {
    path,
    value: getActiveValue(configuration, path)
  }
  if (node.type === "compound") {
    const child = node.children.find((child) => configuration.active.has(child))
    if (child === undefined) {
      throw new Error(`Machine expected compound state "${path}" to have an active child`)
    }
    snapshot.state = snapshotFromPath(machine, configuration, child)
  }
  if (node.type === "parallel") {
    const states: Record<string, unknown> = {}
    for (const child of node.children) {
      if (!configuration.active.has(child)) {
        throw new Error(`Machine expected parallel state "${path}" to have active child region "${child}"`)
      }
      const childNode = getNode(machine, child)
      states[childNode.key] = snapshotFromPath(machine, configuration, child)
    }
    snapshot.states = states
  }
  return snapshot as unknown as Machine.SnapshotByIdentifier<States, Machine.StateIdentifier<States>>
}

export const snapshotFromConfiguration = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  configuration: ActiveConfiguration
): Machine.Snapshot<States> => {
  const snapshot = snapshotFromPath<States>(
    machine,
    configuration,
    getRootPath(machine, configuration)
  ) as Machine.Snapshot<States>
  const root = getRootPath(machine, configuration)
  const retainPartialOutputs = !isActiveFinalNode(machine, configuration, root)
  const completed = Array.from(configuration.outputs)
    .filter(([path]) => retainPartialOutputs || hasCompletionHandler(machine, path))
    .map(([path, output]) => ({ path, output }))
  if (completed.length > 0) {
    ;(snapshot as Machine.AtomicSnapshot<string, unknown> & {
      completed: ReadonlyArray<Machine.SnapshotCompletion>
    }).completed = completed
  }
  return snapshot
}

export const configurationFromSnapshot = (
  machine: Machine.Any,
  snapshot: Machine.AtomicSnapshot<string, unknown>
): ActiveConfiguration => {
  const active = new Set<string>()
  const values = new Map<string, unknown>()
  const snapshotOutputs = snapshot.completed

  const visit = (current: Machine.AtomicSnapshot<string, unknown>): void => {
    const node = getNode(machine, String(current.path))
    if (!Schema.is(node.schema)(current.value)) {
      throw new Error(`Machine expected snapshot for "${node.path}" to match its schema`)
    }
    active.add(node.path)
    values.set(node.path, current.value)
    if (node.type === "compound") {
      if (!hasProperty(current, "state") || !isSnapshot(current.state)) {
        throw new Error(`Machine expected compound snapshot "${node.path}" to include an active child state`)
      }
      const child = getNode(machine, String(current.state.path))
      if (child.parent !== node.path) {
        throw new Error(`Machine expected snapshot "${child.path}" to be a child of "${node.path}"`)
      }
      visit(current.state)
    }
    if (node.type === "parallel") {
      if (!hasProperty(current, "states") || typeof current.states !== "object" || current.states === null) {
        throw new Error(`Machine expected parallel snapshot "${node.path}" to include active child regions`)
      }
      const states = current.states as Readonly<Record<string, unknown>>
      for (const childPath of node.children) {
        const child = getNode(machine, childPath)
        const childSnapshot = states[child.key]
        if (!hasOwn(states, child.key) || !isSnapshot(childSnapshot)) {
          throw new Error(`Machine expected parallel snapshot "${node.path}" to include region "${child.key}"`)
        }
        const snapshotChild = getNode(machine, String(childSnapshot.path))
        if (snapshotChild.path !== child.path) {
          throw new Error(`Machine expected snapshot "${snapshotChild.path}" to be region "${child.path}"`)
        }
        visit(childSnapshot)
      }
    }
  }

  visit(snapshot)
  const outputs = new Map<string, unknown>()
  if (snapshotOutputs !== undefined) {
    for (const { output, path } of snapshotOutputs) {
      if (active.has(path)) {
        outputs.set(path, output)
      }
    }
  }
  return { active, values, outputs }
}

export const normalizeConfiguration = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  state: Machine.Snapshot<States>
): ActiveConfiguration => configurationFromSnapshot(machine, state)

export const configurationFromSnapshotEffect = Effect.fnUntraced(function*(
  machine: Machine.Any,
  snapshot: Machine.AtomicSnapshot<string, unknown>
) {
  const active = new Set<string>()
  const values = new Map<string, unknown>()
  const snapshotOutputs = snapshot.completed

  const visit: (
    current: Machine.AtomicSnapshot<string, unknown>
  ) => Effect.Effect<void, MachineSchemaDecodeError> = Effect.fnUntraced(function*(
    current: Machine.AtomicSnapshot<string, unknown>
  ) {
    const node = getNode(machine, String(current.path))
    const value = yield* decodeStateValue(machine, node, current.value)
    active.add(node.path)
    values.set(node.path, value)
    if (node.type === "compound") {
      if (!hasProperty(current, "state") || !isSnapshot(current.state)) {
        throw new Error(`Machine expected compound snapshot "${node.path}" to include an active child state`)
      }
      const child = getNode(machine, String(current.state.path))
      if (child.parent !== node.path) {
        throw new Error(`Machine expected snapshot "${child.path}" to be a child of "${node.path}"`)
      }
      yield* visit(current.state)
    }
    if (node.type === "parallel") {
      if (!hasProperty(current, "states") || typeof current.states !== "object" || current.states === null) {
        throw new Error(`Machine expected parallel snapshot "${node.path}" to include active child regions`)
      }
      const states = current.states as Readonly<Record<string, unknown>>
      for (const childPath of node.children) {
        const child = getNode(machine, childPath)
        const childSnapshot = states[child.key]
        if (!hasOwn(states, child.key) || !isSnapshot(childSnapshot)) {
          throw new Error(`Machine expected parallel snapshot "${node.path}" to include region "${child.key}"`)
        }
        const snapshotChild = getNode(machine, String(childSnapshot.path))
        if (snapshotChild.path !== child.path) {
          throw new Error(`Machine expected snapshot "${snapshotChild.path}" to be region "${child.path}"`)
        }
        yield* visit(childSnapshot)
      }
    }
  })

  yield* visit(snapshot)
  const outputs = new Map<string, unknown>()
  if (snapshotOutputs !== undefined) {
    for (const { output, path } of snapshotOutputs) {
      if (active.has(path)) {
        outputs.set(path, output)
      }
    }
  }
  return { active, values, outputs } as ActiveConfiguration
})

export const normalizeConfigurationEffect = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  state: Machine.Snapshot<States>
): Effect.Effect<ActiveConfiguration, MachineSchemaDecodeError> =>
  configurationFromSnapshotEffect(machine, state).pipe(
    Effect.catchCause((cause) => {
      const error = Cause.findErrorOption(cause)
      return Option.isSome(error) && error.value instanceof MachineSchemaDecodeError
        ? Effect.fail(error.value)
        : Effect.fail(
          new MachineSchemaDecodeError({
            machineId: machine.id,
            boundary: "configuration",
            cause
          })
        )
    })
  )

export const validateInitialConfiguration = (machine: Machine.Any, configuration: ActiveConfiguration): void => {
  for (const path of configuration.active) {
    const node = getNode(machine, path)
    if (node.type === "compound") {
      const child = node.children.find((child) => configuration.active.has(child))
      if (child !== node.initial) {
        throw new Error(`Machine initial state "${node.path}" must enter initial child "${node.initial}"`)
      }
    }
    if (node.type === "parallel") {
      for (const child of node.children) {
        if (!configuration.active.has(child)) {
          throw new Error(`Machine initial state "${node.path}" must enter child region "${child}"`)
        }
      }
    }
  }
}

export const configurationFromTargetPath = (
  machine: Machine.Any,
  current: ActiveConfiguration,
  path: string,
  value: { readonly _tag: PropertyKey },
  providedValues: Readonly<Record<string, unknown>> | undefined
): ActiveConfiguration => {
  const node = getNode(machine, path)
  const active = new Set<string>()
  const values = new Map<string, unknown>()
  const outputs = new Map<string, unknown>()
  const paths = getPathToRoot(machine, node.path)
  const pathSet = new Set(paths)

  for (const currentPath of paths) {
    active.add(currentPath)
    if (currentPath === node.path) {
      values.set(currentPath, value)
    } else if (providedValues !== undefined && hasOwn(providedValues, currentPath)) {
      values.set(currentPath, providedValues[currentPath])
    } else if (current.values.has(currentPath)) {
      values.set(currentPath, current.values.get(currentPath))
    } else {
      throw new Error(`Machine target "${node.path}" requires a value for ancestor state "${currentPath}"`)
    }
  }

  for (const ancestor of paths) {
    const ancestorNode = getNode(machine, ancestor)
    if (ancestorNode.type === "parallel") {
      for (const child of ancestorNode.children) {
        if (pathSet.has(child) || !current.active.has(child)) {
          continue
        }
        for (const activePath of current.active) {
          if (isPathInSubtree(activePath, child)) {
            active.add(activePath)
            if (current.values.has(activePath)) {
              values.set(activePath, current.values.get(activePath))
            }
            if (current.outputs.has(activePath)) {
              outputs.set(activePath, current.outputs.get(activePath))
            }
          }
        }
      }
    }
  }

  if (node.type === "compound" || node.type === "parallel") {
    throw new Error(`Machine target "${node.path}" must include an active child state`)
  }

  return { active, values, outputs }
}

export const configurationFromTargetPathEffect = Effect.fnUntraced(function*(
  machine: Machine.Any,
  current: ActiveConfiguration,
  path: string,
  value: unknown,
  providedValues: Readonly<Record<string, unknown>> | undefined
) {
  const node = getNode(machine, path)
  const active = new Set<string>()
  const values = new Map<string, unknown>()
  const outputs = new Map<string, unknown>()
  const paths = getPathToRoot(machine, node.path)
  const pathSet = new Set(paths)

  for (const currentPath of paths) {
    const currentNode = getNode(machine, currentPath)
    active.add(currentPath)
    if (currentPath === node.path) {
      values.set(currentPath, yield* decodeStateValue(machine, currentNode, value))
    } else if (providedValues !== undefined && hasOwn(providedValues, currentPath)) {
      values.set(currentPath, yield* decodeStateValue(machine, currentNode, providedValues[currentPath]))
    } else if (current.values.has(currentPath)) {
      values.set(currentPath, current.values.get(currentPath))
    } else {
      throw new Error(`Machine target "${node.path}" requires a value for ancestor state "${currentPath}"`)
    }
  }

  for (const ancestor of paths) {
    const ancestorNode = getNode(machine, ancestor)
    if (ancestorNode.type === "parallel") {
      for (const child of ancestorNode.children) {
        if (pathSet.has(child) || !current.active.has(child)) {
          continue
        }
        for (const activePath of current.active) {
          if (isPathInSubtree(activePath, child)) {
            active.add(activePath)
            if (current.values.has(activePath)) {
              values.set(activePath, current.values.get(activePath))
            }
            if (current.outputs.has(activePath)) {
              outputs.set(activePath, current.outputs.get(activePath))
            }
          }
        }
      }
    }
  }

  if (node.type === "compound" || node.type === "parallel") {
    throw new Error(`Machine target "${node.path}" must include an active child state`)
  }

  return { active, values, outputs } as ActiveConfiguration
})

export const normalizeTargetConfiguration = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  current: ActiveConfiguration,
  target: Machine.Snapshot<States> | Machine.Target<States, Machine.StateIdentifier<States>>
): ActiveConfiguration => {
  if (isTarget(target)) {
    return configurationFromTargetPath(
      machine,
      current,
      target.path,
      target.value as { readonly _tag: PropertyKey },
      target.values as Readonly<Record<string, unknown>> | undefined
    )
  }
  if (isSnapshot(target)) {
    return configurationFromSnapshot(machine, target)
  }
  throw new Error("Machine expected transition target to be a snapshot or target builder result")
}

export const normalizeTargetConfigurationEffect = <const States extends Machine.StateSchemas>(
  machine: Machine.Any,
  current: ActiveConfiguration,
  target: Machine.Snapshot<States> | Machine.Target<States, Machine.StateIdentifier<States>>
): Effect.Effect<ActiveConfiguration, MachineSchemaDecodeError> => {
  if (isTarget(target)) {
    return configurationFromTargetPathEffect(
      machine,
      current,
      target.path,
      target.value,
      target.values as Readonly<Record<string, unknown>> | undefined
    )
  }
  if (isSnapshot(target)) {
    return normalizeConfigurationEffect(machine, target)
  }
  throw new Error("Machine expected transition target to be a snapshot or target builder result")
}

export const getStateConfigByPath = (
  machine: Machine.Any,
  path: string
): Machine.AnyStateConfig | undefined => machine.handlers[path]

export const getActiveChildPath = (
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string
): string | undefined => getNode(machine, path).children.find((child) => configuration.active.has(child))

export const isDirectFinalPath = (
  machine: Machine.Any,
  path: string
): boolean => getNode(machine, path).type === "final" || getStateConfigByPath(machine, path)?.type === "final"

export const hasCompletionHandler = (
  machine: Machine.Any,
  path: string
): boolean => getStateConfigByPath(machine, path)?.onDone !== undefined

export const isActiveFinalNode = (
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string
): boolean => {
  if (!configuration.active.has(path)) {
    return false
  }
  const node = getNode(machine, path)
  if (node.type === "compound") {
    const child = getActiveChildPath(machine, configuration, path)
    return child !== undefined && isDirectFinalPath(machine, child)
  }
  if (node.type === "parallel") {
    for (const child of node.children) {
      if (!isActiveFinalNode(machine, configuration, child)) {
        return false
      }
    }
    return true
  }
  return isDirectFinalPath(machine, path)
}

export const isActiveFinalConfiguration = (
  machine: Machine.Any,
  configuration: ActiveConfiguration
): boolean => {
  const root = getRootPath(machine, configuration)
  return isActiveFinalNode(machine, configuration, root) && !hasCompletionHandler(machine, root)
}

export const setCompletedOutput = (
  outputs: Map<string, unknown>,
  path: string,
  output: unknown
): CompletionResult => {
  if (outputs.has(path)) {
    return {
      path,
      output: outputs.get(path),
      isNew: false
    }
  }
  outputs.set(path, output)
  return {
    path,
    output,
    isNew: true
  }
}

export const resolveFinalOutput = <const Events extends ReadonlyArray<Machine.TaggedSchema>>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs?: Readonly<Record<string, unknown>>
): unknown =>
  getStateConfigByPath(machine, path)?.output?.({
    state: getActiveValue(configuration, path),
    event,
    outputs
  } as any)

export const completeActiveFinalNode = <const Events extends ReadonlyArray<Machine.TaggedSchema>>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs: Map<string, unknown>,
  completions: Array<FinalCompletion>
): CompletionResult | undefined => {
  if (!configuration.active.has(path)) {
    return undefined
  }
  const node = getNode(machine, path)
  if (node.type === "compound") {
    const child = getActiveChildPath(machine, configuration, path)
    if (child === undefined || !isDirectFinalPath(machine, child)) {
      return undefined
    }
    const childCompletion = completeActiveFinalNode(machine, configuration, child, event, outputs, completions)
    if (childCompletion === undefined) {
      return undefined
    }
    const completion = setCompletedOutput(outputs, path, childCompletion.output)
    if (completion.isNew) {
      completions.push(completion)
    }
    return completion
  }
  if (node.type === "parallel") {
    const regionOutputs: Record<string, unknown> = {}
    let completed = true
    for (const child of node.children) {
      const childCompletion = completeActiveFinalNode(machine, configuration, child, event, outputs, completions)
      if (childCompletion === undefined) {
        completed = false
      } else {
        regionOutputs[getNode(machine, child).key] = childCompletion.output
      }
    }
    if (!completed) {
      return undefined
    }
    const completion = setCompletedOutput(
      outputs,
      path,
      resolveFinalOutput(machine, configuration, path, event, regionOutputs)
    )
    if (completion.isNew) {
      completions.push(completion)
    }
    return completion
  }
  if (!isDirectFinalPath(machine, path)) {
    return undefined
  }
  const completion = setCompletedOutput(
    outputs,
    path,
    resolveFinalOutput(machine, configuration, path, event)
  )
  if (completion.isNew) {
    completions.push(completion)
  }
  return completion
}

export const completeConfiguration = <const Events extends ReadonlyArray<Machine.TaggedSchema>>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>
): {
  readonly configuration: ActiveConfiguration
  readonly completions: ReadonlyArray<FinalCompletion>
} => {
  const outputs = new Map(configuration.outputs)
  const completions: Array<FinalCompletion> = []
  const completed = {
    active: configuration.active,
    values: configuration.values,
    outputs
  }
  for (
    const path of Array.from(completed.active).sort((left, right) => {
      const depth = pathDepth(machine, right) - pathDepth(machine, left)
      return depth === 0 ? compareDocumentOrder(machine, left, right) : depth
    })
  ) {
    completeActiveFinalNode(machine, completed, path, event, outputs, completions)
  }
  return { configuration: completed, completions }
}

export const resolveFinalOutputEffect: <
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs?: Readonly<Record<string, unknown>>
) => Effect.Effect<unknown, MachineSchemaDecodeError> = Effect.fnUntraced(function*<
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs?: Readonly<Record<string, unknown>>
) {
  const node = getNode(machine, path)
  const output = getStateConfigByPath(machine, path)?.output?.({
    state: getActiveValue(configuration, path),
    event,
    outputs
  } as any)
  return yield* decodeOutputValue(machine, node, output)
})

export const completeActiveFinalNodeEffect: <
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs: Map<string, unknown>,
  completions: Array<FinalCompletion>
) => Effect.Effect<CompletionResult | undefined, MachineSchemaDecodeError> = Effect.fnUntraced(function*<
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  outputs: Map<string, unknown>,
  completions: Array<FinalCompletion>
) {
  if (!configuration.active.has(path)) {
    return undefined
  }
  const node = getNode(machine, path)
  if (node.type === "compound") {
    const child = getActiveChildPath(machine, configuration, path)
    if (child === undefined || !isDirectFinalPath(machine, child)) {
      return undefined
    }
    const childCompletion = yield* completeActiveFinalNodeEffect(
      machine,
      configuration,
      child,
      event,
      outputs,
      completions
    )
    if (childCompletion === undefined) {
      return undefined
    }
    const completion = setCompletedOutput(outputs, path, childCompletion.output)
    if (completion.isNew) {
      completions.push(completion)
    }
    return completion
  }
  if (node.type === "parallel") {
    const regionOutputs: Record<string, unknown> = {}
    let completed = true
    for (const child of node.children) {
      const childCompletion = yield* completeActiveFinalNodeEffect(
        machine,
        configuration,
        child,
        event,
        outputs,
        completions
      )
      if (childCompletion === undefined) {
        completed = false
      } else {
        regionOutputs[getNode(machine, child).key] = childCompletion.output
      }
    }
    if (!completed) {
      return undefined
    }
    const completion = setCompletedOutput(
      outputs,
      path,
      yield* resolveFinalOutputEffect(machine, configuration, path, event, regionOutputs)
    )
    if (completion.isNew) {
      completions.push(completion)
    }
    return completion
  }
  if (!isDirectFinalPath(machine, path)) {
    return undefined
  }
  const completion = setCompletedOutput(
    outputs,
    path,
    yield* resolveFinalOutputEffect(machine, configuration, path, event)
  )
  if (completion.isNew) {
    completions.push(completion)
  }
  return completion
})

export const completeConfigurationEffect: <
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>
) => Effect.Effect<{
  readonly configuration: ActiveConfiguration
  readonly completions: ReadonlyArray<FinalCompletion>
}, MachineSchemaDecodeError> = Effect.fnUntraced(function*<
  const Events extends ReadonlyArray<Machine.TaggedSchema>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>
) {
  const outputs = new Map(configuration.outputs)
  const completions: Array<FinalCompletion> = []
  const completed = {
    active: configuration.active,
    values: configuration.values,
    outputs
  }
  for (
    const path of Array.from(completed.active).sort((left, right) => {
      const depth = pathDepth(machine, right) - pathDepth(machine, left)
      return depth === 0 ? compareDocumentOrder(machine, left, right) : depth
    })
  ) {
    yield* completeActiveFinalNodeEffect(machine, completed, path, event, outputs, completions)
  }
  return { configuration: completed, completions } as {
    readonly configuration: ActiveConfiguration
    readonly completions: ReadonlyArray<FinalCompletion>
  }
})
