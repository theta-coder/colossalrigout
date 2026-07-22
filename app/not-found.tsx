import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight">404</h1>
      <p className="text-sm sm:text-base text-neutral-600 mt-2 font-light max-w-md">
        The page or product you are looking for could not be found.
      </p>
      <Link
        href="/shop"
        className="mt-6 bg-black text-white text-xs font-semibold px-6 py-3 rounded-md hover:bg-neutral-800 transition tracking-wider uppercase"
      >
        Back to Shop
      </Link>
    </div>
  );
}
