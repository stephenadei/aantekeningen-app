import { Metadata } from 'next'
import { getStudentByShareToken } from '@/lib/share-token'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  
  try {
    const student = await getStudentByShareToken(token)
    const studentName = student?.name || 'Leerling'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    return {
      title: `Aantekeningen van ${studentName} - Stephen's Privelessen`,
      description: `Bekijk de aantekeningen van ${studentName} gedeeld door Stephen's Privelessen.`,
      openGraph: {
        title: `Aantekeningen van ${studentName}`,
        description: `Bekijk de aantekeningen van ${studentName} gedeeld door Stephen's Privelessen.`,
        type: 'website',
        locale: 'nl_NL',
        images: [
          {
            url: `${baseUrl}/share/${token}/opengraph-image`,
            width: 1200,
            height: 630,
            alt: `Aantekeningen van ${studentName}`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `Aantekeningen van ${studentName}`,
        description: `Bekijk de aantekeningen van ${studentName} gedeeld door Stephen's Privelessen.`,
        images: [`${baseUrl}/share/${token}/opengraph-image`],
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    
    // Fallback metadata
    return {
      title: "Aantekeningen - Stephen's Privelessen",
      description: "Bekijk aantekeningen gedeeld door Stephen's Privelessen.",
      openGraph: {
        title: "Aantekeningen - Stephen's Privelessen",
        description: "Bekijk aantekeningen gedeeld door Stephen's Privelessen.",
        type: 'website',
        locale: 'nl_NL',
      },
    }
  }
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

