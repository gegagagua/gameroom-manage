import { notFound } from 'next/navigation';
import { ConsentBanner, ContactTracker } from '@/components/analytics';
import { BookingBoard } from '@/components/booking-board';
import { CONTENT, type Content } from '@/lib/content';
import {
  absoluteUrl,
  APP_URL,
  asset,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_LABEL,
  isLocale,
  LOCALE_NAMES,
  localePath,
  LOCALES,
  PRODUCT_NAME,
  type Locale,
} from '@/lib/site';

function jsonLd(c: Content, lang: Locale) {
  const url = absoluteUrl(localePath(lang));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${absoluteUrl('/')}#organization`,
        name: PRODUCT_NAME,
        url: absoluteUrl('/'),
        contactPoint: { '@type': 'ContactPoint', telephone: CONTACT_PHONE, email: CONTACT_EMAIL, contactType: 'sales', availableLanguage: ['en', 'ka', 'ru'] },
      },
      {
        '@type': 'SoftwareApplication',
        name: PRODUCT_NAME,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web, Windows 10, Windows 11',
        description: c.metaDescription,
        url,
        inLanguage: lang,
        publisher: { '@id': `${absoluteUrl('/')}#organization` },
      },
      {
        '@type': 'FAQPage',
        url,
        inLanguage: lang,
        mainEntity: c.faq.items.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
      },
    ],
  };
}

function Video({ name, label, fallback }: { name: string; label: string; fallback: string }) {
  return (
    <video className="screen" controls muted playsInline preload="none" poster={asset(`${name}-poster.jpg`)} aria-label={label} width={1280} height={800}>
      <source src={asset(`${name}.mp4`)} type="video/mp4" />
      {fallback}
    </video>
  );
}

function LanguageMenu({ lang, label }: { lang: Locale; label: string }) {
  return (
    <nav className="langs" aria-label={label}>
      {LOCALES.map((l) => (
        <a key={l} href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${localePath(l)}`} hrefLang={l} lang={l} title={LOCALE_NAMES[l]} aria-label={LOCALE_NAMES[l]} aria-current={l === lang ? 'true' : undefined}>
          {l}
        </a>
      ))}
    </nav>
  );
}

export default async function LandingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const c = CONTENT[lang];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(c, lang)).replace(/</g, '\\u003c') }} />
      <header className="top">
        <a className="mark" href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${localePath(lang)}`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M12 5.5V12l4.5 3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {PRODUCT_NAME}
        </a>
        <nav className="top-links" aria-label={PRODUCT_NAME}>
          <a href="#book">{c.nav.book}</a>
          <a href="#floor">{c.nav.floor}</a>
          <a href="#bookings">{c.nav.booking}</a>
          <a href="#features">{c.nav.features}</a>
          <a href="#contact">{c.nav.contact}</a>
        </nav>
        <LanguageMenu lang={lang} label={c.nav.language} />
        {APP_URL && <a className="signin" href={APP_URL} rel="nofollow">{c.nav.signIn}</a>}
      </header>

      <main>
        <div className="hero">
          <div className="hero-copy">
            <h1>{c.hero.title}</h1>
            <div>
              <p>{c.hero.body}</p>
              <a href="#contact" className="text-link">{c.hero.owner}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4 12.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></a>
            </div>
          </div>
          <BookingBoard text={c.board} locale={lang} />
        </div>

        <section id="floor" className="band band-chalk split">
          <div className="split-copy">
            <h2>{c.floor.title}</h2>
            <p>{c.floor.body}</p>
            <ul className="ticks">{c.floor.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
          <Video name="room" label={c.floor.videoLabel} fallback={c.videoFallback} />
        </section>

        <section id="bookings" className="band band-pine">
          <div className="section-head">
            <h2>{c.booking.title}</h2>
            <p>{c.booking.body}</p>
          </div>
          <Video name="booking" label={c.booking.videoLabel} fallback={c.videoFallback} />
          <ol className="route">
            {c.booking.steps.map(([title, body]) => (
              <li key={title}><h3>{title}</h3><p>{body}</p></li>
            ))}
          </ol>
          <p className="fine">{c.booking.limits}</p>
        </section>

        <section className="band band-amber split split-flip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="screen" src={asset('kiosk.webp')} alt={c.kiosk.alt} width={2400} height={1350} loading="lazy" decoding="async" />
          <div className="split-copy">
            <h2>{c.kiosk.title}</h2>
            <p>{c.kiosk.body}</p>
            <ul className="ticks">{c.kiosk.points.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        </section>

        <section id="features" className="band band-chalk">
          <h2 className="wide-title">{c.features.title}</h2>
          <dl className="timetable">
            {c.features.items.map(([title, body]) => (
              <div key={title}><dt>{title}</dt><dd>{body}</dd></div>
            ))}
          </dl>
        </section>

        <section className="band band-ink" aria-labelledby="gallery-title">
          <h2 id="gallery-title" className="wide-title">{c.gallery.title}</h2>
          <div className="gallery" tabIndex={0} role="group" aria-labelledby="gallery-title">
            {c.gallery.shots.map((s) => (
              <figure key={s.file}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="screen" src={asset(s.file)} alt={s.alt} width={2400} height={1500} loading="lazy" decoding="async" />
                <figcaption>{s.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="band band-chalk faq">
          <h2>{c.faq.title}</h2>
          <div>
            {c.faq.items.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section id="contact" className="band band-pine close">
          <h2>{c.contact.title}</h2>
          <p>{c.contact.body}</p>
          <a className="big-contact" href={`tel:${CONTACT_PHONE}`}><span>{c.contact.call}</span>{CONTACT_PHONE_LABEL}</a>
          <a className="big-contact" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(PRODUCT_NAME)}`}><span>{c.contact.email}</span>{CONTACT_EMAIL}</a>
        </section>
      </main>

      <footer className="foot">
        <span>© {new Date().getFullYear()} {PRODUCT_NAME}. {c.footer.rights}</span>
        <span>{c.footer.demo}</span>
      </footer>
      <ContactTracker />
      <ConsentBanner text={c.consent} />
    </>
  );
}
