import { Link } from 'react-router-dom';
import { Eye, ShoppingBag } from 'lucide-react';
import WishlistButton from './WishlistButton';
import { Badge, StarRating } from './ui';
import { useCart } from '../context/CartContext';
import { displayPrice, productImage } from '../utils/format';
import { themeOf } from '../utils/themes';

export default function ProductCard({ product, onQuickView }) {
  const { addItem, busy } = useCart();
  const theme = themeOf(product.category?.theme);
  const needsChoice = product.hasVariants;

  const handleAdd = () => {
    if (needsChoice) onQuickView?.(product);
    else addItem(product, { colour: product.colours?.[0]?.name });
  };

  return (
    <article className="group flex h-full flex-col rounded-[28px] bg-white p-3 transition-shadow duration-300 hover:shadow-lift">
      <div className="relative overflow-hidden rounded-[22px]" style={{ background: theme.tile }}>
        <Link to={`/product/${product.slug}`} className="block aspect-square p-5" aria-label={`View ${product.name}`}>
          <img
            src={productImage(product)}
            alt={product.images?.[0]?.alt || product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain drop-shadow-[0_10px_10px_rgba(0,0,0,0.12)] transition-transform duration-500 group-hover:scale-[1.07]"
          />
        </Link>
        <WishlistButton product={product} className="absolute right-3 top-3" />
        {!product.inStock && (
          <Badge bg="#333D25" ink="#fff" className="absolute left-3 top-3">
            Unavailable
          </Badge>
        )}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="absolute inset-x-3 bottom-3 hidden items-center justify-center gap-2 rounded-full bg-white/95 py-2.5 text-sm font-bold opacity-0 shadow-soft transition-opacity duration-200 focus-visible:opacity-100 group-hover:opacity-100 md:flex"
          >
            <Eye size={16} /> Quick view
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <p className="eyebrow text-[0.65rem]" style={{ color: theme.ink, opacity: 0.75 }}>
          {product.category?.name}
        </p>
        <h3 className="mt-1 text-xl">
          <Link to={`/product/${product.slug}`} className="hover:underline">
            {product.name}
          </Link>
        </h3>
        {product.ratingCount > 0 && (
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <StarRating value={product.ratingAverage} size={13} /> ({product.ratingCount})
          </div>
        )}
        <p className="mt-1.5 font-bold">{displayPrice(product)}</p>

        <div className="mt-auto flex gap-2 pt-4">
          <Link to={`/product/${product.slug}`} className="btn btn-outline btn-sm flex-1">
            View details
          </Link>
          <button type="button" onClick={handleAdd} disabled={!product.inStock || busy} className="btn btn-primary btn-sm flex-1" aria-label={`Add ${product.name} to cart`}>
            <ShoppingBag size={15} />
            {needsChoice ? 'Choose size' : 'Add to cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
