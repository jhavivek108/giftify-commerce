import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { InstagramIcon, Reveal } from '../components/ui';
import { FOUNDER, STORY_PARAGRAPHS, STORY_SECTIONS, STORY_TAGLINE } from '../utils/story';
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from '../utils/whatsapp';
import { THEMES } from '../utils/themes';

const SECTION_THEMES = [THEMES.pink, THEMES.yellow, THEMES.lavender, THEMES.mint];

export default function About() {
  return (
    <div className="container-page pb-6 pt-10 sm:pt-14">
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow text-[#B8935A]">About Little Gifts Story</p>
        <h1 className="mt-4 text-5xl sm:text-6xl">Every little gift has a story.</h1>
        <p className="mt-5 text-lg text-muted">
          Little Gifts Story is a small handmade brand of pipe-cleaner flowers, accessories and festive decor. {STORY_TAGLINE}.
        </p>
      </header>

      <section className="mt-12 grid items-center gap-8 lg:grid-cols-12 lg:gap-14" aria-label="Founder">
        <Reveal className="lg:col-span-6">
          <div className="rounded-[32px] bg-[#CBE3F4] p-3">
            <img src={FOUNDER.photo} alt={`${FOUNDER.name} holding a bouquet of handmade blue blooms`} className="w-full rounded-[24px] object-cover" />
          </div>
        </Reveal>
        <Reveal className="lg:col-span-6" delay={0.08}>
          <p className="eyebrow text-[#B8935A]">Meet the maker</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">{FOUNDER.name}</h2>
          <p className="mt-1 font-bold">{FOUNDER.title}</p>
          <p className="mt-5 text-lg leading-relaxed text-olive/85">{STORY_PARAGRAPHS[0]}</p>
          <p className="mt-4 leading-relaxed text-muted">{STORY_PARAGRAPHS[1]}</p>
        </Reveal>
      </section>

      <section className="mt-14 grid gap-5 md:grid-cols-12" aria-label="The journey">
        {STORY_SECTIONS.slice(1).map((section, i) => {
          const theme = SECTION_THEMES[i % SECTION_THEMES.length];
          const span = i === 0 ? 'md:col-span-7' : i === 1 ? 'md:col-span-5' : 'md:col-span-12';
          return (
            <Reveal key={section.heading} className={span} delay={i * 0.06}>
              <article className="h-full rounded-[32px] p-8 sm:p-10" style={{ background: theme.bg, color: theme.ink }}>
                <p className="eyebrow opacity-75">Chapter {String(i + 2).padStart(2, '0')}</p>
                <h2 className="mt-3 text-3xl sm:text-4xl">{section.heading}</h2>
                <div className={`mt-4 space-y-4 leading-relaxed ${i === 2 ? 'md:columns-2 md:gap-10 md:space-y-0 [&>p]:mb-4' : ''}`}>
                  {section.paragraphs.map((index) => (
                    <p key={index}>{STORY_PARAGRAPHS[index]}</p>
                  ))}
                </div>
              </article>
            </Reveal>
          );
        })}
      </section>

      <Reveal>
        <section className="mt-5 rounded-[32px] bg-burgundy px-8 py-12 text-center text-[#FFE9C2] sm:px-12">
          <p className="font-script text-6xl text-gold">With love,</p>
          <p className="mt-2 font-display text-3xl font-bold text-white">{FOUNDER.name}</p>
          <p className="mt-1">{FOUNDER.title}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/shop" className="btn btn-gold">
              Explore collection <ArrowRight size={17} />
            </Link>
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="btn border-[1.5px] border-white/40 text-white hover:bg-white/10">
              <InstagramIcon size={18} /> {INSTAGRAM_HANDLE}
            </a>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
