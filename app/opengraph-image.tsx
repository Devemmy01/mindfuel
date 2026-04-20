import { ImageResponse } from 'next/og'

export const alt = 'MindFuel — Fuel Your Mind Daily'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #111827, #000000)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
          <div style={{
            background: '#00bf63',
            width: '80px',
            height: '80px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '56px',
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0, 191, 99, 0.3)'
          }}>
            M
          </div>
          <div style={{ fontSize: 96, fontWeight: 900, fontFamily: 'sans-serif', letterSpacing: '-0.05em' }}>
            MindFuel
          </div>
        </div>
        <div style={{ fontSize: 40, opacity: 0.85, fontWeight: 500, marginTop: '16px', fontFamily: 'sans-serif' }}>
          A calm, intentional space to share your thoughts.
        </div>
      </div>
    ),
    { ...size }
  )
}
