import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, getDoc, setDoc, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ShopCategory } from '../../../lib/category';

const categoryCollection = 'shop-categories';
const categoryImageCollection = 'shop-category-images';

// GET: Fetch active (or all) categories ordered by 'order'
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fetchAll = searchParams.get('all') === 'true';

    const colRef = collection(db, categoryCollection);
    const q = query(colRef, orderBy('order', 'asc'));
    const [snapshot, imageSnapshot] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, categoryImageCollection))
    ]);

    const imageDataByCategory = new Map<string, string>();
    imageSnapshot.forEach(imageDoc => {
      const dataUrl = imageDoc.data().dataUrl;
      if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        imageDataByCategory.set(imageDoc.id, dataUrl);
      }
    });

    const categories: ShopCategory[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      categories.push({
        id: docSnap.id,
        name: String(data.name || ''),
        slug: String(data.slug || ''),
        imagePath: String(data.imagePath || ''),
        imageUrl: imageDataByCategory.get(docSnap.id) || (typeof data.imageUrl === 'string' && data.imageUrl.startsWith('data:image/') ? data.imageUrl : ''),
        order: Number(data.order) || 0,
        active: data.active !== false,
        style: data.style === 'sale' ? 'sale' : 'image',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      });
    });

    // Sort explicitly in case order values match or are adjusted
    categories.sort((a, b) => (a.order || 0) - (b.order || 0));

    const resultData = fetchAll ? categories : categories.filter(c => c.active);

    return NextResponse.json({
      success: true,
      data: resultData,
      message: 'Categories retrieved successfully',
      source: 'firestore'
    });
  } catch (error: any) {
    console.error("[API GET /api/categories] Error fetching categories:", error);
    return NextResponse.json({
      success: false,
      data: [],
      message: 'Failed to retrieve categories from the database',
      error: error.message
    }, { status: 500 });
  }
}

// POST: Create or Update category
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category } = body;

    if (!category || !category.name) {
      return NextResponse.json({
        success: false,
        message: 'Category name is required'
      }, { status: 400 });
    }

    // Slug generation and normalization
    const normalizedSlug = (category.slug || category.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!normalizedSlug) {
      return NextResponse.json({
        success: false,
        message: 'Invalid slug generated'
      }, { status: 400 });
    }

    // Existing documents check for duplicate slug if creating new or changing slug
    const colRef = collection(db, categoryCollection);
    const snapshot = await getDocs(colRef);
    const existingDocs: ShopCategory[] = [];
    snapshot.forEach(docSnap => {
      existingDocs.push({ id: docSnap.id, ...docSnap.data() } as ShopCategory);
    });

    const isDuplicate = existingDocs.some(
      c => c.slug === normalizedSlug && c.id !== category.id
    );

    if (isDuplicate) {
      return NextResponse.json({
        success: false,
        message: `Category with slug "${normalizedSlug}" already exists.`
      }, { status: 400 });
    }

    // Image cleanup if image is changing
    if (category.id) {
      try {
        const docRef = doc(db, categoryCollection, category.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const oldData = docSnap.data();
          if (oldData.imagePath && oldData.imagePath !== category.imagePath) {
            const { ref, deleteObject } = await import('firebase/storage');
            const { storage } = await import('../../../lib/firebase');
            const oldFileRef = ref(storage, oldData.imagePath);
            await deleteObject(oldFileRef);
            console.log(`[API POST /api/categories] Cleaned up old image ${oldData.imagePath}`);
          }
        }
      } catch (cleanupErr: any) {
        console.warn("[API POST /api/categories] Storage cleanup failed or skipped:", cleanupErr.message);
      }
    }

    const docId = category.id || `cat-${Date.now()}`;
    const now = new Date().toISOString();

    const imageData = typeof category.imageUrl === 'string' && category.imageUrl.startsWith('data:image/')
      ? category.imageUrl
      : '';
    const imagePath = imageData ? `${categoryImageCollection}/${docId}` : '';

    const formattedCategory: ShopCategory = {
      id: docId,
      name: category.name.trim(),
      slug: normalizedSlug,
      imagePath,
      imageUrl: '',
      order: typeof category.order === 'number' ? category.order : existingDocs.length + 1,
      active: category.active !== undefined ? Boolean(category.active) : true,
      style: category.style === 'sale' ? 'sale' : 'image',
      createdAt: category.createdAt || now,
      updatedAt: now
    };

    if (formattedCategory.style === 'image' && !imageData) {
      return NextResponse.json({
        success: false,
        message: 'A category image file is required.'
      }, { status: 400 });
    }

    await Promise.all([
      setDoc(doc(db, categoryCollection, docId), formattedCategory),
      setDoc(doc(db, categoryImageCollection, docId), {
        categoryId: docId,
        dataUrl: imageData,
        updatedAt: now
      })
    ]);
    console.log(`[API POST /api/categories] Created/Updated category "${formattedCategory.name}" (${docId})`);

    return NextResponse.json({
      success: true,
      data: { ...formattedCategory, imageUrl: imageData },
      message: category.id ? 'Category updated successfully' : 'Category created successfully'
    });
  } catch (error: any) {
    console.error("[API POST /api/categories] Error writing category:", error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to save category'
    }, { status: 500 });
  }
}

// PUT: Update category (e.g. quick toggle active status or reorder)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { category } = body;

    if (!category || !category.id) {
      return NextResponse.json({
        success: false,
        message: 'Category ID is required for update'
      }, { status: 400 });
    }

    const docRef = doc(db, categoryCollection, category.id);
    const currentSnapshot = await getDoc(docRef);
    if (!currentSnapshot.exists()) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }
    const current = currentSnapshot.data();
    const updatedAt = new Date().toISOString();

    const incomingImageData = typeof category.imageUrl === 'string' && category.imageUrl.startsWith('data:image/')
      ? category.imageUrl
      : '';
    const currentImageSnapshot = await getDoc(doc(db, categoryImageCollection, category.id));
    const storedImageData = currentImageSnapshot.exists() ? String(currentImageSnapshot.data().dataUrl || '') : '';
    const imageData = incomingImageData || storedImageData;
    const imagePath = imageData ? `${categoryImageCollection}/${category.id}` : '';

    const updatedCategory: ShopCategory = {
      id: category.id,
      name: String(category.name || current.name || '').trim(),
      slug: String(category.slug || current.slug || '').trim(),
      imagePath,
      imageUrl: '',
      order: Number(category.order ?? current.order) || 0,
      active: category.active !== undefined ? Boolean(category.active) : current.active !== false,
      style: category.style === 'sale' ? 'sale' : 'image',
      createdAt: current.createdAt || updatedAt,
      updatedAt
    };

    const writes: Promise<void>[] = [setDoc(docRef, updatedCategory)];
    if (imageData) {
      writes.push(setDoc(doc(db, categoryImageCollection, category.id), {
        categoryId: category.id,
        dataUrl: imageData,
        updatedAt
      }));
    }
    await Promise.all(writes);
    console.log(`[API PUT /api/categories] Updated category ${category.id}`);

    return NextResponse.json({
      success: true,
      data: { ...updatedCategory, imageUrl: imageData },
      message: 'Category updated successfully'
    });
  } catch (error: any) {
    console.error("[API PUT /api/categories] Error updating category:", error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to update category'
    }, { status: 500 });
  }
}

// DELETE: Remove category
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Category ID parameter is required'
      }, { status: 400 });
    }

    // Clean up Storage image if it exists
    try {
      const docRef = doc(db, categoryCollection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.imagePath) {
          const { ref, deleteObject } = await import('firebase/storage');
          const { storage } = await import('../../../lib/firebase');
          const fileRef = ref(storage, data.imagePath);
          await deleteObject(fileRef);
          console.log(`[API DELETE /api/categories] Cleaned up Storage image ${data.imagePath}`);
        }
      }
    } catch (storageErr: any) {
      console.warn("[API DELETE /api/categories] Storage cleanup failed or skipped:", storageErr.message);
    }

    await Promise.all([
      deleteDoc(doc(db, categoryCollection, id)),
      deleteDoc(doc(db, categoryImageCollection, id))
    ]);
    console.log(`[API DELETE /api/categories] Deleted category ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error: any) {
    console.error("[API DELETE /api/categories] Error deleting category:", error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to delete category'
    }, { status: 500 });
  }
}
