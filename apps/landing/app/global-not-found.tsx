import '@fontsource-variable/onest';
import './[lang]/landing.css';
import type { Metadata } from 'next';
import { BASE_PATH, PRODUCT_NAME } from '@/lib/site';

export const metadata: Metadata = { title: `404 · ${PRODUCT_NAME}`, robots: { index: false } };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="site">
        <main className="band band-pine close">
          <h1 className="not-found-title">404</h1>
          <p>This page is not on the timetable.</p>
          <a className="text-link" href={`${BASE_PATH}/`}>{PRODUCT_NAME}</a>
        </main>
      </body>
    </html>
  );
}
