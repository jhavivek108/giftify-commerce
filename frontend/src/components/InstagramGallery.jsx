import { InstagramIcon, Reveal } from './ui';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../utils/whatsapp';
import { THEMES } from '../utils/themes';

// Real photographs from the catalogue. Replace or extend with new posts any time.
const PHOTOS = [
  { src: '/images/brand/craft-table.jpg', alt: 'Finished pieces laid out on the craft table', cover: true },
  { src: '/images/products/ocean-bloom.webp', alt: 'Ocean Bloom diya holders', tile: THEMES.blue.tile },
  { src: '/images/brand/bouquet.webp', alt: 'A bouquet of Little Love Blooms', tile: THEMES.pink.tile },
  { src: '/images/brand/founder.jpg', alt: 'Nisha holding a bouquet of blue blooms', cover: true },
  { src: '/images/products/lavender-love.webp', alt: 'Lavender Love diya holders', tile: THEMES.lavender.tile },
  { src: '/images/brand/sunflower-pot.webp', alt: 'A Tiny Gardens sunflower pot', tile: THEMES.yellow.tile },
];

export default function InstagramGallery() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        {PHOTOS.map((photo, i) => (
          <Reveal key={photo.src} delay={i * 0.04}>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={`${photo.alt} — open Instagram`}
              className="group relative block aspect-square overflow-hidden rounded-[24px]"
              style={{ background: photo.tile || '#fff' }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.07] ${photo.cover ? 'object-cover' : 'object-contain p-4'}`}
              />
              <span className="absolute inset-0 grid place-items-center bg-olive/0 text-white opacity-0 transition-all duration-300 group-hover:bg-olive/35 group-hover:opacity-100">
                <InstagramIcon size={28} />
              </span>
            </a>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 text-center">
        <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn btn-primary">
          <InstagramIcon size={18} /> Follow {INSTAGRAM_HANDLE}
        </a>
      </div>
    </div>
  );
}
