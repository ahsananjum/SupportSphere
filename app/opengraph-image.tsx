import { ImageResponse } from 'next/og';

export const alt = 'SupportSphere — a calmer foundation for customer support';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 76,
        background: '#162431',
        color: '#f5f2e9',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 32,
          fontWeight: 700,
        }}
      >
        <span style={{ color: '#c2efaa', fontSize: 50 }}>✳</span> SupportSphere
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{
            fontSize: 74,
            fontWeight: 700,
            lineHeight: 1.04,
            maxWidth: 930,
          }}
        >
          Support should feel more human.
        </div>
        <div style={{ color: '#c2efaa', fontSize: 27 }}>
          A calmer foundation for customer support.
        </div>
      </div>
    </div>,
    size,
  );
}
