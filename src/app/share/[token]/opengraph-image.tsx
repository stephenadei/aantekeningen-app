import { ImageResponse } from 'next/og'
import { getStudentByShareToken } from '@/lib/share-token'

export const runtime = 'edge'
export const alt = 'Aantekeningen gedeeld'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  
  try {
    const student = await getStudentByShareToken(token)
    const studentName = student?.name || 'Leerling'
    
    // Get first letter for avatar
    const firstLetter = studentName.charAt(0).toUpperCase()
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            position: 'relative',
          }}
        >
          {/* Decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -150,
              left: -150,
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
            }}
          />
          
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            {/* Avatar circle with initial */}
            <div
              style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 40,
                border: '8px solid rgba(255, 255, 255, 0.3)',
                fontSize: 80,
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {firstLetter}
            </div>
            
            <div
              style={{
                fontSize: 42,
                marginBottom: 20,
                opacity: 0.95,
                fontWeight: 600,
                color: 'white',
              }}
            >
              📚 Aantekeningen
            </div>
            <div
              style={{
                fontSize: 84,
                marginBottom: 20,
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.2,
              }}
            >
              {studentName}
            </div>
            <div
              style={{
                fontSize: 28,
                opacity: 0.85,
                marginTop: 10,
                color: 'white',
                fontWeight: 500,
              }}
            >
              Gedeeld door Stephen's Privelessen
            </div>
          </div>
        </div>
      ),
      {
        ...size,
      }
    )
  } catch (error) {
    console.error('Error generating OG image:', error)
    
    // Fallback image
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontSize: 60,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          <div
            style={{
              fontSize: 48,
            }}
          >
            📚 Aantekeningen
          </div>
        </div>
      ),
      {
        ...size,
      }
    )
  }
}

