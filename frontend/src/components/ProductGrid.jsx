import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from './ProductCard';
import CustomisationForm, { emptySelection, selectionPrice } from './CustomisationForm';
import { Modal } from './ui';
import { useCart } from '../context/CartContext';
import { priceWithUnit, productImage } from '../utils/format';
import { themeOf } from '../utils/themes';

function QuickView({ product, onClose }) {
  const { addItem, busy } = useCart();
  const navigate = useNavigate();
  const [selection, setSelection] = useState(() => emptySelection(product));
  const theme = themeOf(product.category?.theme);

  const add = async (thenCheckout) => {
    const ok = await addItem(product, {
      variantId: selection.variantId,
      colour: selection.colour,
      quantity: selection.quantity,
      customisation: { instructions: selection.instructions, message: selection.message },
      silent: thenCheckout,
    });
    if (!ok) return;
    onClose();
    if (thenCheckout) navigate('/checkout');
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="grid aspect-square place-items-center rounded-[24px] p-6" style={{ background: theme.tile }}>
        <img src={productImage(product)} alt={product.name} className="max-h-full max-w-full object-contain drop-shadow-[0_12px_12px_rgba(0,0,0,0.14)]" />
      </div>
      <div>
        <p className="eyebrow text-muted">{product.category?.name}</p>
        <h2 className="mt-1 text-3xl">{product.name}</h2>
        <p className="mt-2 text-xl font-bold">{priceWithUnit(selectionPrice(product, selection), product.priceUnit)}</p>
        <div className="mt-5">
          <CustomisationForm product={product} value={selection} onChange={setSelection} compact />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button className="btn btn-primary flex-1" disabled={!product.inStock || busy} onClick={() => add(false)}>
            Add to cart
          </button>
          <button className="btn btn-outline flex-1" disabled={!product.inStock || busy} onClick={() => add(true)}>
            Buy now
          </button>
        </div>
        <Link to={`/product/${product.slug}`} onClick={onClose} className="mt-4 inline-block text-sm font-bold underline">
          View full details
        </Link>
      </div>
    </div>
  );
}

export default function ProductGrid({ products, columns = 4 }) {
  const [quick, setQuick] = useState(null);
  const cols = columns === 3 ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <>
      <div className={`grid grid-cols-1 gap-5 min-[420px]:grid-cols-2 ${cols}`}>
        {products.map((product, i) => (
          <motion.div
            key={product._id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: Math.min(i % 4, 3) * 0.05 }}
          >
            <ProductCard product={product} onQuickView={setQuick} />
          </motion.div>
        ))}
      </div>
      <Modal open={Boolean(quick)} onClose={() => setQuick(null)} title="" wide>
        {quick && <QuickView key={quick._id} product={quick} onClose={() => setQuick(null)} />}
      </Modal>
    </>
  );
}
