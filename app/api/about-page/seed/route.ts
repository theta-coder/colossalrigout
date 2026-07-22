import { NextRequest, NextResponse } from 'next/server';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { requireAdmin } from '../../../../lib/serverAuth';
import {
  AboutPageSettings,
  AboutStoryBlock,
  AboutValue,
  AboutTeamMember,
  AboutPagePayload,
  defaultSettings,
} from '../../../../lib/about-page';

const SETTINGS_DOC = 'about-page/settings';
const STORY_COL = 'about-story-blocks';
const VALUES_COL = 'about-values';
const TEAM_COL = 'about-team-members';

async function fetchImageAsBase64(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('Not an image');
    const buffer = Buffer.from(await blob.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${blob.type};base64,${base64}`;
    if (dataUrl.length > 900_000) {
      throw new Error('Image too large for inline storage');
    }
    return dataUrl;
  } finally {
    clearTimeout(timeout);
  }
}

const initialStoryBlocks = [
  "Colossal Rigout started with a simple idea: everyday clothing shouldn't feel like a compromise between comfort and confidence. What began as a small collection of wardrobe staples has grown into a full range of pieces designed for people who want to look put-together without overthinking it.",
  "We work closely with our production partners to keep quality high and turnaround honest, from the first sketch to the final stitch. Every piece is tested for fit, fabric feel, and durability before it ever reaches the shop page.",
  "Today, Colossal Rigout serves customers who value style that lasts — not just for a season, but for years of everyday wear. This is only the beginning of the story, and we're glad you're part of it.",
];

const initialValues = [
  { title: 'SUSTAINABLE MATERIALS', description: 'Better for you. Better for the planet.', icon: 'leaf' },
  { title: 'ETHICAL PRODUCTION', description: 'Made with care and respect.', icon: 'shield' },
  { title: 'COMMUNITY FOCUSED', description: 'Fashion that gives back.', icon: 'users' },
];

const initialTeam = [
  { name: 'Amna Sheikh', role: 'Founder & Creative Director', img: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=400&q=80', alt: 'Amna Sheikh, Founder & Creative Director' },
  { name: 'Danish Ali', role: 'Head of Product', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', alt: 'Danish Ali, Head of Product' },
  { name: 'Hira Malik', role: 'Design Lead', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', alt: 'Hira Malik, Design Lead' },
  { name: 'Osman Tariq', role: 'Operations Manager', img: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&w=400&q=80', alt: 'Osman Tariq, Operations Manager' },
];

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin instanceof NextResponse) return admin;

    const storySnap = await getDocs(collection(db, STORY_COL));
    const valuesSnap = await getDocs(collection(db, VALUES_COL));
    const teamSnap = await getDocs(collection(db, TEAM_COL));
    const settingsSnap = await getDoc(doc(db, SETTINGS_DOC));

    const totalExisting = storySnap.size + valuesSnap.size + teamSnap.size + (settingsSnap.exists() ? 1 : 0);
    if (totalExisting > 0) {
      return NextResponse.json({
        success: false,
        message: `Seed blocked: Database already contains ${storySnap.size} story blocks, ${valuesSnap.size} values, ${teamSnap.size} team members, and ${settingsSnap.exists() ? 'settings' : 'no settings'}.`,
      }, { status: 409 });
    }

    const now = new Date().toISOString();

    // 1. Seed Settings
    const settings: AboutPageSettings = {
      ...defaultSettings,
      updatedAt: now,
    };
    await setDoc(doc(db, SETTINGS_DOC), settings);

    // 2. Seed Story Blocks
    for (let i = 0; i < initialStoryBlocks.length; i++) {
      const storyId = `story-${i + 1}`;
      const storyDoc: AboutStoryBlock = {
        id: storyId,
        text: initialStoryBlocks[i],
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, STORY_COL, storyId), storyDoc);
    }

    // 3. Seed Values
    for (let i = 0; i < initialValues.length; i++) {
      const valueId = `value-${i + 1}`;
      const valueDoc: AboutValue = {
        id: valueId,
        title: initialValues[i].title,
        description: initialValues[i].description,
        icon: initialValues[i].icon,
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, VALUES_COL, valueId), valueDoc);
    }

    // 4. Seed Team Members (try to import images)
    for (let i = 0; i < initialTeam.length; i++) {
      const memberId = `member-${i + 1}`;
      let imageDataUrl = '';
      try {
        imageDataUrl = await fetchImageAsBase64(initialTeam[i].img);
      } catch {
        imageDataUrl = '';
      }

      const memberDoc: AboutTeamMember = {
        id: memberId,
        name: initialTeam[i].name,
        role: initialTeam[i].role,
        bio: '',
        image: imageDataUrl,
        imageAlt: initialTeam[i].alt,
        order: i + 1,
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(doc(db, TEAM_COL, memberId), memberDoc);
    }

    return NextResponse.json({
      success: true,
      message: `About page seeded! Added settings, ${initialStoryBlocks.length} story blocks, ${initialValues.length} values, and ${initialTeam.length} team members.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
