/**
 * @since 1.0.0
 */
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category constructors
 */
export const MachineId = Schema.Int.pipe(
  Schema.brand("MachineId"),
  Schema.annotations({
    pretty: () => (machineId) => `MachineId(${machineId})`
  })
)

/**
 * @since 1.0.0
 * @category models
 */
export type MachineId = typeof MachineId.Type

/**
 * @since 1.0.0
 * @category Constructors
 */
export const make = (shardId: number): MachineId => MachineId.make(shardId)
