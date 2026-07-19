import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ProductImageDocument } from '../../../types/commerce';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      // Check single file input
      const singleFile = formData.get('file') as File;
      if (singleFile) {
        files.push(singleFile);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });

    const uploadedImages: ProductImageDocument[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate file type
      const mimeType = file.type || 'image/jpeg';
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
      if (!validTypes.includes(mimeType)) {
        return NextResponse.json({ error: `Unsupported file type: ${mimeType}` }, { status: 400 });
      }

      // Generate unique filename
      const ext = path.extname(file.name) || '.jpg';
      const fileId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const fileName = `${fileId}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, buffer);

      const publicUrl = `/uploads/${fileName}`;

      const imageDoc: ProductImageDocument = {
        id: fileId,
        storagePath: filePath,
        url: publicUrl,
        originalName: file.name,
        mimeType,
        size: file.size,
        role: 'gallery',
        order: uploadedImages.length,
        createdAt: new Date().toISOString(),
      };

      // Also attempt to save metadata in Firestore 'product-images' collection
      try {
        await setDoc(doc(db, 'product-images', fileId), imageDoc);
      } catch (err) {
        console.warn(`Firestore write skipped for image ${fileId}:`, err);
      }

      uploadedImages.push(imageDoc);
    }

    return NextResponse.json({ success: true, images: uploadedImages });
  } catch (error: any) {
    console.error('[API POST /api/upload] File upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
