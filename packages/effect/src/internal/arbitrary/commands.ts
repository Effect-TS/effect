import type {
  Arbitrary,
  Command,
  CommandCall,
  CommandCount,
  Commands,
  CommandsFailure,
  CommandsOptions,
  CommandsRun,
  CommandStep,
  Reference,
  Resolve
} from "../../Arbitrary.ts"
import * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import * as Exit from "../../Exit.ts"
import * as Formatter from "../../Formatter.ts"
import { hasProperty } from "../../Predicate.ts"
import * as InternalArray from "../array.ts"
import { done } from "../core.ts"
import * as Model from "./model.ts"
import { make } from "./runner.ts"

/** @internal */
export const ReferenceTypeId = "~effect/arbitrary/Reference"

class ReferenceImpl {
  readonly [ReferenceTypeId] = ReferenceTypeId
  readonly id: number
  constructor(id: number) {
    this.id = id
  }
  toString() {
    return `$${this.id}`
  }
}

const isReference = (u: unknown): u is ReferenceImpl => hasProperty(u, ReferenceTypeId)

// Collects the references used by arguments for the scope check while shrinking. Values that cannot contain a
// reference are skipped, and `seen` guards against cycles and shared substructures.
function forEachReference(value: unknown, f: (reference: ReferenceImpl) => void): void {
  const seen = new Set<object>()
  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null || seen.has(value)) return
    seen.add(value)
    if (isReference(value)) return f(value)
    if (ArrayBuffer.isView(value)) return
    if (value instanceof Map) {
      for (const [key, item] of value) {
        visit(key)
        visit(item)
      }
      return
    }
    if (value instanceof Set) {
      for (const item of value) visit(item)
      return
    }
    for (const key of Reflect.ownKeys(value)) {
      if (Object.prototype.propertyIsEnumerable.call(value, key)) visit((value as Record<PropertyKey, unknown>)[key])
    }
  }
  visit(value)
}

type AnyCommand<M> = Command<M, any, any, any, any>

interface Definition<M> {
  readonly initial: M
  readonly commands: ReadonlyArray<AnyCommand<M>>
  readonly invariant: ((model: M, resolve: Resolve) => boolean | Effect.Effect<boolean, unknown, any>) | undefined
  readonly maxCommands: number
}

interface Planned {
  readonly command: number
  readonly args: Model.Retained<unknown>
  readonly reference: ReferenceImpl
}

interface Program<M> {
  readonly definition: Definition<M>
  readonly steps: ReadonlyArray<Planned>
  // The model before each step, followed by the final model.
  readonly models: ReadonlyArray<M>
  readonly rejected: ReadonlyArray<number>
}

const programs = new WeakMap<object, Program<any>>()

class CommandsImpl {
  readonly steps: ReadonlyArray<CommandCall>
  constructor(steps: ReadonlyArray<CommandCall>) {
    this.steps = steps
  }
  toString() {
    if (this.steps.length === 0) return "Commands()"
    const lines = this.steps.map((step) =>
      `  ${step.reference} = ${step.command}(${step.args === undefined ? "" : Formatter.format(step.args)})`
    )
    return `Commands(\n${lines.join("\n")}\n)`
  }
}

function makeCommands<M>(program: Program<M>): Commands<M, never> {
  const commands = new CommandsImpl(program.steps.map((step) => ({
    command: program.definition.commands[step.command].name,
    args: step.args.value,
    reference: step.reference as unknown as Reference<unknown>
  })))
  programs.set(commands, program)
  return commands as unknown as Commands<M, never>
}

const available = <M>(command: AnyCommand<M>, model: M): boolean =>
  command.args === undefined || command.args(model) !== undefined

const allowed = <M>(command: AnyCommand<M>, model: M, args: unknown): boolean =>
  command.precondition === undefined || command.precondition(model, args)

const step = <M>(command: AnyCommand<M>, model: M, args: unknown, reference: ReferenceImpl): M =>
  command.next === undefined ? model : command.next(model, args, reference as unknown as Reference<unknown>)

// Replays the model along a candidate sequence and drops every step that is no longer available, whose precondition
// fails, or whose arguments use a reference that no earlier retained step defines. Dropping a step also removes its
// reference from scope.
function validate<M>(definition: Definition<M>, steps: ReadonlyArray<Planned>): Program<M> {
  const retained: Array<Planned> = []
  const models: Array<M> = []
  const scope = new Set<ReferenceImpl>()
  let model = definition.initial
  for (const planned of steps) {
    const command = definition.commands[planned.command]
    const args = planned.args.value
    let inScope = true
    forEachReference(args, (reference) => {
      if (!scope.has(reference)) inScope = false
    })
    if (!inScope || !available(command, model) || !allowed(command, model, args)) continue
    retained.push(planned)
    models.push(model)
    scope.add(planned.reference)
    model = step(command, model, args, planned.reference)
  }
  models.push(model)
  return { definition, steps: retained, models, rejected: definition.commands.map(() => 0) }
}

function makeSample<M>(program: Program<M>, elementStart: number): Model.Sample<Commands<M, never>> {
  const value = makeCommands(program)
  if (program.steps.length === 0) return Model.makeSample(value)
  return Model.makeSampleWithLazyShrinks(value, () => shrinks(program, elementStart))
}

function shrinks<M>(
  program: Program<M>,
  elementStart: number
): Model.ShrinkPull<Model.Attempt<Commands<M, never>>> {
  const { definition, steps } = program
  let index = 0
  let removable: number | undefined
  let argShrinks: Model.ShrinkPull<Model.Retained<unknown> | Model.Discarded> | undefined
  // Adapt the array shrinker: at each position remove progressively smaller blocks, then shrink the arguments there.
  // Revalidation drops the steps that the smaller sequence no longer allows.
  const loop = (): Model.ShrinkPull<Model.Attempt<Commands<M, never>>> =>
    Effect.suspend(() => {
      while (index < steps.length) {
        removable ??= steps.length - index
        if (removable > 0) {
          const count = removable
          removable = Math.floor(removable / 2)
          const candidate = steps.slice(0, index).concat(steps.slice(index + count))
          return Effect.succeed(makeSample(validate(definition, candidate), 0))
        }
        if (index >= elementStart) argShrinks ??= steps[index].args.shrinks?.()
        if (argShrinks !== undefined) {
          return Effect.matchCauseEffect(argShrinks, {
            onFailure: Model.onTypedFailure(() => {
              argShrinks = undefined
              removable = undefined
              index++
              return loop()
            }),
            onSuccess: (args): Effect.Effect<Model.Attempt<Commands<M, never>>> => {
              if (args._tag === "Discarded") return Effect.succeed(args)
              const candidate = InternalArray.replaceAt(steps, index, { ...steps[index], args })
              return Effect.succeed(makeSample(validate(definition, candidate), index))
            }
          })
        }
        index++
        removable = undefined
      }
      return done()
    })
  return loop()
}

const noArgs = Model.makeSample(undefined)

// Bounds the candidates drawn for one position before the sequence ends early.
const maxCandidates = 100

const generate = Effect.fnUntraced(function*<M>(definition: Definition<M>, state: Model.GenerationState) {
  const upper = Math.min(definition.maxCommands, state.size)
  const length = Model.randomLength(state, 0, upper)
  const rejected = definition.commands.map(() => 0)
  const steps: Array<Planned> = []
  const models: Array<M> = []
  let model = definition.initial
  for (let position = 0; position < length; position++) {
    const eligible = definition.commands.map((_, index) => index)
    let selected: { readonly command: number; readonly args: Model.Sample<unknown> } | undefined
    for (let candidates = 0; selected === undefined && eligible.length > 0 && candidates < maxCandidates;) {
      const choice = Model.randomIndex(state, eligible.length)
      const index = eligible[choice]
      const command = definition.commands[index]
      const arbitrary: Arbitrary<unknown> | undefined = command.args === undefined ? undefined : command.args(model)
      let attempt: Model.Attempt<unknown> = noArgs
      if (command.args !== undefined) {
        if (arbitrary === undefined) {
          eligible.splice(choice, 1)
          continue
        }
        attempt = yield* Model.toEffectGeneration(arbitrary.gen.generate({
          size: state.size,
          shrinks: state.shrinks,
          biasFactor: state.biasFactor,
          nullPrototype: state.nullPrototype,
          random: state.random,
          budget: { remaining: arbitrary.gen.minCost + state.size }
        }))
      }
      candidates++
      if (attempt._tag === "Discarded" || !allowed(command, model, attempt.value)) {
        rejected[index]++
        continue
      }
      selected = { command: index, args: attempt }
    }
    if (selected === undefined) break
    const reference = new ReferenceImpl(position)
    steps.push({ command: selected.command, args: Model.retain(selected.args), reference })
    models.push(model)
    model = step(definition.commands[selected.command], model, selected.args.value, reference)
  }
  models.push(model)
  const program: Program<M> = { definition, steps, models, rejected }
  return state.shrinks ? makeSample(program, 0) : Model.makeSample(makeCommands(program))
})

/** @internal */
export function commands<M, R>(options: CommandsOptions<M, R>): Arbitrary<Commands<M, R>> {
  const maxCommands = options.maxCommands ?? Number.MAX_SAFE_INTEGER
  if (!Number.isSafeInteger(maxCommands) || maxCommands < 0) {
    throw new RangeError("Arbitrary.commands: expected maxCommands to be a non-negative safe integer")
  }
  const names = new Set<string>()
  for (const command of options.commands) {
    if (names.has(command.name)) {
      throw new Error(`Arbitrary.commands: duplicate command name ${JSON.stringify(command.name)}`)
    }
    names.add(command.name)
  }
  const definition: Definition<M> = {
    initial: options.initial,
    commands: options.commands.slice(),
    invariant: options.invariant,
    maxCommands
  }
  return make(Model.makeGenerator(0, (state) => generate(definition, state))) as Arbitrary<Commands<M, R>>
}

const isInterruption = (cause: Cause.Cause<unknown>) => Cause.hasInterrupts(cause)

/** @internal */
export const runCommands = <M, R>(
  commands: Commands<M, R>
): Effect.Effect<CommandsRun<M>, CommandsFailure<M>, R> =>
  Effect.suspend(() => {
    const program = programs.get(commands) as Program<M> | undefined
    if (program === undefined) {
      return Effect.die(new Error("Arbitrary.runCommands: expected commands generated by Arbitrary.commands"))
    }
    const { definition, models, steps } = program
    const runs = definition.commands.map(() => 0)
    const results = new Map<ReferenceImpl, Exit.Exit<unknown, unknown>>()
    const trace: Array<CommandStep<M>> = []
    const counts = (): ReadonlyArray<CommandCount> =>
      definition.commands.map((command, index) => ({
        name: command.name,
        runs: runs[index],
        rejected: program.rejected[index]
      }))
    const fail = (
      reason: CommandsFailure<M>["reason"],
      model: M,
      cause?: Cause.Cause<unknown>
    ): Effect.Effect<never, CommandsFailure<M>> =>
      Effect.fail({
        _tag: "CommandsFailure",
        reason,
        steps: trace,
        model,
        counts: counts(),
        ...(cause === undefined ? undefined : { cause })
      })
    const resolve: Resolve = <A>(input: Reference<A>): A => {
      const reference = input as unknown as ReferenceImpl
      if (!isReference(reference)) throw new Error("Arbitrary.runCommands: expected a reference")
      const exit = results.get(reference)
      if (exit === undefined || Exit.isFailure(exit)) {
        throw new Error(
          `Arbitrary.runCommands: reference ${reference} is unavailable because the command that defines it ${
            exit === undefined ? "did not run" : "failed"
          }`
        )
      }
      return exit.value as A
    }
    const checkInvariant = Effect.fnUntraced(function*(model: M) {
      if (definition.invariant === undefined) return
      let output: boolean | Effect.Effect<boolean, unknown, any>
      try {
        output = definition.invariant(model, resolve)
      } catch (defect) {
        return yield* fail("Invariant", model, Cause.die(defect))
      }
      if (Effect.isEffect(output)) {
        const checked = yield* Effect.exit(output)
        if (Exit.isFailure(checked)) {
          if (isInterruption(checked.cause)) return yield* Effect.failCause(checked.cause)
          return yield* fail("Invariant", model, checked.cause)
        }
        output = checked.value
      }
      if (output !== true) return yield* fail("Invariant", model)
    })
    return Effect.gen(function*() {
      yield* checkInvariant(models[0])
      for (let index = 0; index < steps.length; index++) {
        const planned = steps[index]
        const command = definition.commands[planned.command]
        const model = models[index]
        const next = models[index + 1]
        const args = planned.args.value
        const exit = yield* Effect.exit(Effect.suspend(() => command.run(args, resolve)))
        if (Exit.isFailure(exit) && isInterruption(exit.cause)) return yield* Effect.failCause(exit.cause)
        runs[planned.command]++
        results.set(planned.reference, exit)
        trace.push({
          command: command.name,
          args,
          reference: planned.reference as unknown as Reference<unknown>,
          model,
          exit
        })
        let accepted: boolean
        try {
          accepted = command.postcondition === undefined
            ? Exit.isSuccess(exit)
            : command.postcondition(model, args, exit, resolve) === true
        } catch (defect) {
          return yield* fail("Postcondition", next, Cause.die(defect))
        }
        if (!accepted) return yield* fail("Postcondition", next)
        yield* checkInvariant(next)
      }
      return { steps: trace, model: models[models.length - 1], counts: counts() } satisfies CommandsRun<M>
    })
  })
