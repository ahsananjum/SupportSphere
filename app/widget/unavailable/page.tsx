import type { Metadata } from 'next';
import '../widget.css';
export const metadata: Metadata = {
  title: 'Support unavailable',
  robots: { index: false, follow: false },
};
export default function WidgetUnavailable() {
  return (
    <main id="main-content" className="widget-root widget-unavailable">
      <strong>Support is unavailable</strong>
      <p>Check your connection or refresh the website to retry.</p>
    </main>
  );
}
