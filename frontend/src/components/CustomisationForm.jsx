import { Check } from 'lucide-react';
import { QuantityStepper } from './ui';
import { REQUEST_COLOURS } from '../utils/themes';
import { formatINR } from '../utils/format';

/**
 * Colour, size, quantity and personalisation inputs for one product.
 * Controlled component: `value` = { variantId, colour, quantity, instructions, message }.
 * Size options only appear for products that really have size variants.
 */
export const emptySelection = (product) => ({
  variantId: product?.hasVariants ? product.variants.find((v) => v.isAvailable !== false && v.stock > 0)?._id || '' : '',
  colour: product?.colours?.[0]?.name || '',
  quantity: 1,
  instructions: '',
  message: '',
});

export const selectedVariant = (product, value) => product?.variants?.find((v) => v._id === value.variantId) || null;

export const selectionPrice = (product, value) => selectedVariant(product, value)?.price ?? product?.basePrice ?? 0;

export const maxQuantityFor = (product, value) => {
  const stock = product?.hasVariants ? selectedVariant(product, value)?.stock ?? 0 : product?.stock ?? 0;
  return Math.max(1, Math.min(20, stock));
};

export default function CustomisationForm({ product, value, onChange, compact = false }) {
  if (!product) return null;
  const set = (patch) => onChange({ ...value, ...patch });
  const pictured = product.colours || [];
  const picturedNames = new Set(pictured.map((c) => c.name.toLowerCase()));
  const requestable = product.customisable ? REQUEST_COLOURS.filter((c) => !picturedNames.has(c.name.toLowerCase())) : [];

  const Swatch = ({ colour, hint }) => {
    const active = value.colour === colour.name;
    return (
      <button
        type="button"
        onClick={() => set({ colour: colour.name })}
        aria-pressed={active}
        title={hint ? `${colour.name} (${hint})` : colour.name}
        className={`flex items-center gap-2 rounded-full border-[1.5px] bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors ${active ? 'border-olive' : 'border-line hover:border-olive/50'}`}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full border border-black/10" style={{ background: colour.hex }}>
          {active && <Check size={13} className={colour.hex?.toUpperCase() === '#FFFFFF' ? 'text-olive' : 'text-white'} strokeWidth={3} />}
        </span>
        {colour.name}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {(pictured.length > 0 || requestable.length > 0) && (
        <fieldset>
          <legend className="label">
            Colour{value.colour ? <span className="font-medium text-muted"> · {value.colour}</span> : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {pictured.map((c) => (
              <Swatch key={c.name} colour={c} hint="as pictured" />
            ))}
            {requestable.map((c) => (
              <Swatch key={c.name} colour={c} hint="on request" />
            ))}
          </div>
          {requestable.length > 0 && <p className="mt-2 text-xs text-muted">The first colour is the one pictured. Others are made on request.</p>}
        </fieldset>
      )}

      {product.hasVariants && (
        <fieldset>
          <legend className="label">Size</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const unavailable = v.isAvailable === false || v.stock < 1;
              const active = value.variantId === v._id;
              return (
                <button
                  key={v._id}
                  type="button"
                  disabled={unavailable}
                  onClick={() => set({ variantId: v._id, quantity: Math.min(value.quantity, Math.max(1, Math.min(20, v.stock))) })}
                  aria-pressed={active}
                  className={`rounded-2xl border-[1.5px] px-4 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'border-olive bg-olive text-white' : 'border-line bg-white hover:border-olive/50'}`}
                >
                  <span className="block font-bold">{v.size}</span>
                  <span className={active ? 'text-white/80' : 'text-muted'}>
                    {unavailable ? 'Unavailable' : `${formatINR(v.price)}${product.priceUnit ? ` · ${product.priceUnit}` : ''}`}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <span className="label">Quantity</span>
        <QuantityStepper value={value.quantity} onChange={(quantity) => set({ quantity })} max={maxQuantityFor(product, value)} />
      </div>

      {product.customisable && (
        <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
          <div>
            <label className="label" htmlFor={`instructions-${product._id}`}>
              Customisation instructions <span className="font-medium text-muted">(optional)</span>
            </label>
            <textarea
              id={`instructions-${product._id}`}
              className="input min-h-24 resize-y"
              maxLength={500}
              placeholder="A different colour, style or detail? Tell us here."
              value={value.instructions}
              onChange={(e) => set({ instructions: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor={`message-${product._id}`}>
              Personalised message <span className="font-medium text-muted">(optional)</span>
            </label>
            <textarea
              id={`message-${product._id}`}
              className="input min-h-24 resize-y"
              maxLength={300}
              placeholder="A little note to go with your gift."
              value={value.message}
              onChange={(e) => set({ message: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
