import { Product } from '../lib/products';
import { formatPkr } from '../lib/utils';

export default function ProductPrice({ product, className = '' }: { product: Product; className?: string }) {
  const retail = Number(product.retailPrice || product.price);
  const discount = product.discountPrice && product.discountPrice < retail ? Number(product.discountPrice) : null;
  return <div className={`flex items-center gap-2 flex-wrap ${className}`}>
    <span className="font-bold text-neutral-900">{formatPkr(discount || retail)}</span>
    {discount && <><span className="text-neutral-400 line-through text-sm">{formatPkr(retail)}</span><span className="bg-red-50 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded">-{Math.round((1 - discount / retail) * 100)}%</span></>}
  </div>;
}
