import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

export default function WishlistButton({ product, className = '', size = 18 }) {
  const { has, toggle } = useWishlist();
  const saved = has(product._id);
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      className={`grid h-10 w-10 place-items-center rounded-full bg-white/95 shadow-soft transition-colors hover:bg-white ${className}`}
    >
      <Heart size={size} className={saved ? 'fill-rose text-rose' : 'text-olive'} />
    </motion.button>
  );
}
