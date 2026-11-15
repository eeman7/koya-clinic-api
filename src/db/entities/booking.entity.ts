import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { Slot } from "./slot.entity";

export type BookingStatus = "confirmed" | "cancelled";

/**
 * The partial unique index is the final guarantee that a slot never has two
 * confirmed bookings, whatever the application code does.
 */
@Index("uq_booking_confirmed_slot", ["slotId"], {
  unique: true,
  where: `"status" = 'confirmed'`,
})
@Entity("bookings")
export class Booking {
  @PrimaryColumn({ type: "uuid" })
  id: string;

  /** Monotonic insertion order; drives "oldest first" and the page cursor. */
  @Index({ unique: true })
  @Column({ type: "bigint" })
  @Generated("increment")
  seq: string;

  @Column({ name: "slot_id", type: "varchar" })
  slotId: string;

  @ManyToOne(() => Slot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "slot_id" })
  slot: Slot;

  @Column({ type: "varchar" })
  name: string;

  @Index()
  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar", default: "confirmed" })
  status: BookingStatus;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
