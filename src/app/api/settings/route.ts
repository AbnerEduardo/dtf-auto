import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userId = getCurrentUserId(request);

    let settings = db.prepare('SELECT * FROM dtf_settings WHERE user_id = ?').get(userId) as any;
    if (!settings) {
      db.prepare(`
        INSERT INTO dtf_settings (user_id, roll_width_cm, spacing_cm, margin_cm, allow_rotation, default_adult_height_cm, default_plussize_height_cm, default_infant_height_cm, default_moletom_height_cm)
        VALUES (?, 57.0, 1.0, 1.0, 1, 28.0, 32.0, 18.0, 30.0)
      `).run(userId);
      settings = db.prepare('SELECT * FROM dtf_settings WHERE user_id = ?').get(userId);
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const body = await request.json();

    const {
      roll_width_cm = 57.0,
      spacing_cm = 1.0,
      margin_cm = 1.0,
      allow_rotation = 1,
      default_adult_height_cm = 28.0,
      default_plussize_height_cm = 32.0,
      default_infant_height_cm = 18.0,
      default_moletom_height_cm = 30.0,
    } = body;

    db.prepare(`
      INSERT INTO dtf_settings (
        user_id, roll_width_cm, spacing_cm, margin_cm, allow_rotation,
        default_adult_height_cm, default_plussize_height_cm, default_infant_height_cm, default_moletom_height_cm, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        roll_width_cm = excluded.roll_width_cm,
        spacing_cm = excluded.spacing_cm,
        margin_cm = excluded.margin_cm,
        allow_rotation = excluded.allow_rotation,
        default_adult_height_cm = excluded.default_adult_height_cm,
        default_plussize_height_cm = excluded.default_plussize_height_cm,
        default_infant_height_cm = excluded.default_infant_height_cm,
        default_moletom_height_cm = excluded.default_moletom_height_cm,
        updated_at = datetime('now')
    `).run(
      userId,
      Number(roll_width_cm),
      Number(spacing_cm),
      Number(margin_cm),
      allow_rotation ? 1 : 0,
      Number(default_adult_height_cm),
      Number(default_plussize_height_cm),
      Number(default_infant_height_cm),
      Number(default_moletom_height_cm)
    );

    const updated = db.prepare('SELECT * FROM dtf_settings WHERE user_id = ?').get(userId);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
