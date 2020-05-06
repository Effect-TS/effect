import { Type } from "class-transformer"
import { Column, Entity, PrimaryColumn } from "typeorm"

// experimental alpha
/* istanbul ignore file */

@Entity({
  synchronize: false
})
export class EventLog {
  @PrimaryColumn("uuid")
  id: string

  @Column("jsonb")
  event: {}

  @Column("text")
  kind: string

  @Column("bigint")
  sequence: string

  @Column({
    type: "text",
    name: "sequence_id"
  })
  sequenceId: string

  @Column("text")
  aggregate: string

  @Column("text")
  root: string

  @Column({
    type: "timestamp",
    name: "created_at"
  })
  @Type(() => Date)
  createdAt: Date

  @Column("jsonb")
  offsets: {}

  @Column("jsonb")
  meta: {}
}
