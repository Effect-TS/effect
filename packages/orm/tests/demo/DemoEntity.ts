import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class DemoEntity {
  @PrimaryColumn()
  id: string;
}