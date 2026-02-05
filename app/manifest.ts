import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Corri - AI 생물 분석기',
    short_name: 'Corri',
    description: '사진을 찍어 생물을 분석하는 AI 서비스',
    start_url: '/',
    display: 'standalone',
    background_color: '#BFE3FF',
    theme_color: '#3C86B8',
    icons: [
      {
        src: '/icons/192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
