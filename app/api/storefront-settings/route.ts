import { NextResponse } from 'next/server';
import { getAllStorefrontSettings } from '@/lib/server/storefront-settings';

export async function GET() {
  try {
    const settings = await getAllStorefrontSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to load storefront content settings.' },
      { status: 500 }
    );
  }
}
