import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

/** The stored outcome of a booking request, replayed when the key is reused. */
@Entity("idempotency_keys")
export class IdempotencyKey {
  @PrimaryColumn({ type: "varchar" })
  key: string;

  /** SHA-256 of the normalised request body. */
  @Column({ name: "request_hash", type: "varchar" })
  requestHash: string;

  @Column({ name: "status_code", type: "int" })
  statusCode: number;

  @Column({ type: "jsonb" })
  response: unknown;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
