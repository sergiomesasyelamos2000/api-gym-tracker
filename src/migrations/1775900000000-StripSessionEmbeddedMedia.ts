import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Strip imageUrl/giftUrl from historical session jsonb payloads.
 * New sessions no longer embed media (Phase B); this shrinks old rows.
 * Preserves exercise array order via WITH ORDINALITY.
 */
export class StripSessionEmbeddedMedia1775900000000
  implements MigrationInterface
{
  name = 'StripSessionEmbeddedMedia1775900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "routine_session_entity" AS s
      SET "exercises" = COALESCE((
        SELECT jsonb_agg((t.elem - 'imageUrl' - 'giftUrl') ORDER BY t.ord)
        FROM jsonb_array_elements(COALESCE(s."exercises", '[]'::jsonb))
             WITH ORDINALITY AS t(elem, ord)
      ), '[]'::jsonb)
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(s."exercises", '[]'::jsonb)) AS e
        WHERE e ? 'imageUrl' OR e ? 'giftUrl'
      )
    `);
  }

  public async down(): Promise<void> {
    // Irreversible: media blobs are not restored.
  }
}
