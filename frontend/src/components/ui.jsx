import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Star, X } from 'lucide-react';

/* Small shared building blocks used across pages. */

export function InstagramIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.2 8.2 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.25 8.23a8.3 8.3 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24Zm-3.3 3.9c-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.11-.23-.17-.48-.29-.25-.13-1.47-.73-1.7-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23a7.5 7.5 0 0 1-1.38-1.72c-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.45Z" />
    </svg>
  );
}

export function LoadingSpinner({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-muted ${className}`} role="status">
      <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-olive" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorMessage({ error, onRetry, className = '' }) {
  if (!error) return null;
  return (
    <div className={`rounded-3xl bg-[#FBE9EC] px-6 py-8 text-center text-[#6E1420] ${className}`} role="alert">
      <p className="font-medium">{error.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-outline btn-sm mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="surface mx-auto max-w-xl px-6 py-14 text-center">
      <h2 className="text-2xl">{title}</h2>
      {children && <p className="mx-auto mt-3 max-w-sm text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Fades content up the first time it scrolls into view. */
export function Reveal({ children, delay = 0, className = '', as = 'div' }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </Tag>
  );
}

export function SectionHeading({ eyebrow, title, children, align = 'left', action }) {
  const centered = align === 'center';
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10 ${centered ? 'text-center' : ''}`}>
      <div className={centered ? 'mx-auto' : ''}>
        {eyebrow && <p className="eyebrow mb-3 text-[#B8935A]">{eyebrow}</p>}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl">{title}</h2>
        {children && <p className={`mt-3 max-w-xl text-muted ${centered ? 'mx-auto' : ''}`}>{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 20, size = 'md', disabled }) {
  const dim = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10';
  const set = (next) => onChange(Math.max(min, Math.min(max, next)));
  return (
    <div className="inline-flex items-center rounded-full border-[1.5px] border-line bg-white">
      <button type="button" className={`${dim} grid place-items-center rounded-full disabled:opacity-40`} onClick={() => set(value - 1)} disabled={disabled || value <= min} aria-label="Decrease quantity">
        <Minus size={15} />
      </button>
      <span className="min-w-8 text-center text-sm font-bold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={`${dim} grid place-items-center rounded-full disabled:opacity-40`} onClick={() => set(value + 1)} disabled={disabled || value >= max} aria-label="Increase quantity">
        <Plus size={15} />
      </button>
    </div>
  );
}

export function StarRating({ value = 0, size = 16, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const star = <Star size={size} className={filled ? 'fill-[#F2B61A] text-[#F2B61A]' : 'text-line'} />;
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-checked={n === value} role="radio">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

export function Badge({ children, bg = '#E8F2E6', ink = '#1E4A26', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${className}`} style={{ background: bg, color: ink }}>
      {children}
    </span>
  );
}

/** Accessible modal: closes on Escape / backdrop, locks page scroll while open. */
export function Modal({ open, onClose, title, children, wide = false }) {
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-olive/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-[28px] bg-cream p-5 shadow-lift outline-none sm:rounded-[28px] sm:p-8 ${wide ? 'sm:max-w-4xl' : 'sm:max-w-xl'}`}
          >
            <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white hover:bg-line">
              <X size={18} />
            </button>
            {title && <h2 className="mb-5 pr-12 text-2xl">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
