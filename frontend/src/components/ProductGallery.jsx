import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { imageUrl } from '../utils/format';

export default function ProductGallery({ images = [], name, tile = '#FBE9EC' }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [{ url: '', alt: name }];
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div>
      <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ background: tile }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={current.url}
            src={imageUrl(current.url)}
            alt={current.alt || name}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="max-h-full max-w-full object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.16)]"
          />
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {list.map((image, i) => (
            <button
              key={image.url + i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-pressed={i === active}
              className={`h-20 w-20 shrink-0 rounded-2xl border-2 p-2 ${i === active ? 'border-olive' : 'border-transparent'}`}
              style={{ background: tile }}
            >
              <img src={imageUrl(image.url)} alt="" loading="lazy" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
