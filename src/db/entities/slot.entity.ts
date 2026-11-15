import { Column, Entity, Index, PrimaryColumn } from "typeorm";

@Entity("slots")
export class Slot {
  @PrimaryColumn({ type: "varchar" })
  id: string;

  @Index()
  @Column({ type: "varchar" })
  provider: string;

  /** Parsed instants, used for ordering and the "already started" check. */
  @Index()
  @Column({ type: "timestamptz" })
  start: Date;

  @Column({ type: "timestamptz" })
  end: Date;

  /** The strings exactly as supplied, echoed back unchanged. */
  @Column({ name: "start_text", type: "varchar" })
  startText: string;

  @Column({ name: "end_text", type: "varchar" })
  endText: string;
}
