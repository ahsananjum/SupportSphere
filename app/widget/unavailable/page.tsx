import type { Metadata } from 'next';
import '../widget.css';
export const metadata: Metadata = {
  title: 'Support unavailable',
  description:
    'The SupportSphere support widget is temporarily unavailable. Refresh the page to try again.',
  robots: { index: false, follow: false },
};
export default function WidgetUnavailable() {
  return (
    <main
      id="main-content"
      className="widget-root widget-unavailable"
      aria-labelledby="widget-unavailable-title"
    >
      <h1 id="widget-unavailable-title">Support is unavailable</h1>
      <p>Check your connection or refresh the website to retry.</p>
    </main>
  );
}
