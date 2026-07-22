import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { requireAdmin } from '../../../lib/serverAuth';
import {
  AboutPageSettings,
  AboutStoryBlock,
  AboutValue,
  AboutTeamMember,
  AboutPagePayload,
  defaultSettings,
} from '../../../lib/about-page';

const SETTINGS_DOC = 'about-page/settings';
const STORY_COL = 'about-story-blocks';
const VALUES_COL = 'about-values';
const TEAM_COL = 'about-team-members';

export async function GET(request: NextRequest) {
  try {
    const all = new URL(request.url).searchParams.get('all') === 'true';
    if (all) {
      const admin = await requireAdmin(request);
      if (admin instanceof NextResponse) return admin;
    }

    const settingsSnap = await getDoc(doc(db, SETTINGS_DOC));
    const settings: AboutPageSettings = settingsSnap.exists()
      ? ({ id: settingsSnap.id, ...settingsSnap.data() } as AboutPageSettings)
      : defaultSettings;

    const storySnap = await getDocs(collection(db, STORY_COL));
    const storyBlocks = storySnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AboutStoryBlock))
      .filter((s) => all || s.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const valuesSnap = await getDocs(collection(db, VALUES_COL));
    const values = valuesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AboutValue))
      .filter((v) => all || v.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const teamSnap = await getDocs(collection(db, TEAM_COL));
    const teamMembers = teamSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AboutTeamMember))
      .filter((t) => all || t.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const payload: AboutPagePayload = {
      settings,
      storyBlocks,
      values,
      teamMembers,
    };

    return NextResponse.json({ success: true, data: payload });
  } catch (error: any) {
    return NextResponse.json({ success: false, data: null, message: error.message }, { status: 500 });
  }
}
