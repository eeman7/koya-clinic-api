import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/** One row per accepted booking attempt; backs the per-email rate limit. */
@Index("idx_booking_attempts_email_at", ["email", "attemptedAt"])
@Entity("booking_attempts")
export class BookingAttempt {
  @PrimaryGeneratedColumn("increment")
  id: string;

  @Column({ type: "varchar" })
  email: string;

  @Column({ name: "attempted_at", type: "timestamptz" })
  attemptedAt: Date;
}
