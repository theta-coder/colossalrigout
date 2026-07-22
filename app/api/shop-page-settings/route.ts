import { NextResponse } from 'next/server';
import { getShopBannerSettings } from '@/lib/server/shop-page-settings';

export async function GET() {
  try {
    const banner = await getShopBannerSettings();
    return NextResponse.json({
      success: true,
      data: {
        banner,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to load shop page settings.' },
      { status: 500 }
    );
  }
}
