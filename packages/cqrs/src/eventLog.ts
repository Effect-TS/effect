import { PrimaryGeneratedColumn, Column, Entity } from "typeorm";
import { Type } from "class-transformer";

// experimental alpha
/* istanbul ignore file */

@Entity({
  synchronize: false
})
export class EventLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("jsonb")
  event: {};

  @Column("text")
  kind: string;

  @Column("bigint")
  sequence: string;

  @Column("text")
  sequenceId: string;

  @Column("text")
  aggregate: string;

  @Column("text")
  root: string;

  @Column("timestamp")
  @Type(() => Date)
  createdAt: Date;

  @Column("jsonb")
  offsets: {};

  @Column("jsonb")
  meta: {};
}
