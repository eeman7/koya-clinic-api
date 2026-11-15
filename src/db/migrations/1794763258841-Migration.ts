import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1794763258841 implements MigrationInterface {
    name = 'Migration1794763258841'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "slots" ("id" character varying NOT NULL, "provider" character varying NOT NULL, "start" TIMESTAMP WITH TIME ZONE NOT NULL, "end" TIMESTAMP WITH TIME ZONE NOT NULL, "start_text" character varying NOT NULL, "end_text" character varying NOT NULL, CONSTRAINT "PK_8b553bb1941663b63fd38405e42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_aa1cc5c0559db381a1fd3b54c6" ON "slots"  ("provider") `);
        await queryRunner.query(`CREATE INDEX "IDX_fa3bb30dc7d9f0598d72e748f2" ON "slots"  ("start") `);
        await queryRunner.query(`CREATE TABLE "bookings" ("id" uuid NOT NULL, "seq" BIGSERIAL NOT NULL, "slot_id" character varying NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'confirmed', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bee6805982cc1e248e94ce94957" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_16a4dcb099f6c0691a76e7bf1e" ON "bookings"  ("seq") `);
        await queryRunner.query(`CREATE INDEX "IDX_f3096d7be57f3db822f7850d97" ON "bookings"  ("email") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_booking_confirmed_slot" ON "bookings"  ("slot_id") WHERE "status" = 'confirmed'`);
        await queryRunner.query(`CREATE TABLE "idempotency_keys" ("key" character varying NOT NULL, "request_hash" character varying NOT NULL, "status_code" integer NOT NULL, "response" jsonb NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0afd83cbf08c9d12089a9bffc5e" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "booking_attempts" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "attempted_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_1b4f9d7f01d3c7443d9c3a30859" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_booking_attempts_email_at" ON "booking_attempts"  ("email", "attempted_at") `);
        await queryRunner.query(`ALTER TABLE "bookings" ADD CONSTRAINT "FK_409d5b76fb2b0501a8c72dd4eeb" FOREIGN KEY ("slot_id") REFERENCES "slots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_409d5b76fb2b0501a8c72dd4eeb"`);
        await queryRunner.query(`DROP INDEX "public"."idx_booking_attempts_email_at"`);
        await queryRunner.query(`DROP TABLE "booking_attempts"`);
        await queryRunner.query(`DROP TABLE "idempotency_keys"`);
        await queryRunner.query(`DROP INDEX "public"."uq_booking_confirmed_slot"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f3096d7be57f3db822f7850d97"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16a4dcb099f6c0691a76e7bf1e"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa3bb30dc7d9f0598d72e748f2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_aa1cc5c0559db381a1fd3b54c6"`);
        await queryRunner.query(`DROP TABLE "slots"`);
    }

}
