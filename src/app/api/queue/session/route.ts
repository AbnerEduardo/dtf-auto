import { NextResponse } from 'next/server';
import db, { getCurrentUserId } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const session = db.prepare('SELECT * FROM current_metro_session WHERE user_id = ?').get(userId) as any;
    if (session) {
      return NextResponse.json({
        success: true,
        session: {
          rollWidthCm: session.roll_width_cm,
          rollHeightCm: session.roll_height_cm,
          marginCm: session.margin_cm,
          spacingCm: session.spacing_cm,
          allowRotation: session.allow_rotation === 1,
          items: JSON.parse(session.items_json || '[]'),
          placedItems: JSON.parse(session.placed_items_json || '[]'),
          sourceFilename: session.source_filename,
          updatedAt: session.updated_at,
        },
      });
    }

    return NextResponse.json({ success: true, session: null });
  } catch (err: any) {
    console.error('Error fetching session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = getCurrentUserId(request);
    const body = await request.json();
    const {
      rollWidthCm = 57.0,
      rollHeightCm = 100.0,
      marginCm = 1.0,
      spacingCm = 1.0,
      allowRotation = true,
      items = [],
      placedItems = [],
      sourceFilename = null,
    } = body;

    db.prepare(`
      INSERT INTO current_metro_session (
        user_id, roll_width_cm, roll_height_cm, margin_cm, spacing_cm,
        allow_rotation, items_json, placed_items_json, source_filename, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        roll_width_cm = excluded.roll_width_cm,
        roll_height_cm = excluded.roll_height_cm,
        margin_cm = excluded.margin_cm,
        spacing_cm = excluded.spacing_cm,
        allow_rotation = excluded.allow_rotation,
        items_json = excluded.items_json,
        placed_items_json = excluded.placed_items_json,
        source_filename = excluded.source_filename,
        updated_at = datetime('now')
    `).run(
      userId,
      rollWidthCm,
      rollHeightCm,
      marginCm,
      spacingCm,
      allowRotation ? 1 : 0,
      JSON.stringify(items),
      JSON.stringify(placedItems),
      sourceFilename
    );

    return NextResponse.json({ success: true, savedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error saving session:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
