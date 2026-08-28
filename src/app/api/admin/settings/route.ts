import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { requireAdmin } from '@/lib/accessControl';
import { PLAN_CONFIG } from '@/lib/config/pricing';

export async function GET(request: Request) {
  const { isAdmin, errorResponse } = await requireAdmin(request);
  if (!isAdmin) return NextResponse.json({ error: errorResponse.error }, { status: errorResponse.status });

  return NextResponse.json({
    settings: {
      monthlyPrice: PLAN_CONFIG.monthly_price,
      trialDays: 7,
      defaultRollWidthCm: 57.0,
      defaultMarginCm: 1.0,
      defaultSpacingCm: 1.0,
    },
  });
}
