import { Compass, Eye, Gem, Handshake, Lightbulb, ShieldCheck, Target, Timer, type LucideIcon } from 'lucide-react'

/** About Us page content. Edit freely — the page layout reads everything from here. */

export const aboutIntro = [
  'Reel Craft Studio is a creative video production studio based in Sivakasi, Tamil Nadu. We make Instagram reels, promotional videos, product films, social media content and personal branding videos that help businesses and people get noticed.',
  'From textile expos in Sivakasi to mobile stores in Rajapalayam and jewellery showrooms, we work side by side with local brands to turn their offers, products and stories into videos customers actually watch.',
]

export const story = {
  title: ['Beyond Videos.', 'Learn the Art.'] as const,
  paragraphs: [
    'Our name describes what we do: we craft reels. Our tagline describes how we think. A good video is more than nice footage. It has a clear idea, a strong opening, the right people on camera and an edit that respects the viewer’s time.',
    'That is the art we keep learning and the craft we bring to every project. Whether it is a 30-second offer reel or a full brand film, we plan carefully, shoot with care and edit until the story lands.',
  ],
}

export const missionVision: { title: string; icon: LucideIcon; text: string }[] = [
  {
    title: 'Our Mission',
    icon: Target,
    text: 'To help every business, big or small, tell its story through video that is creative, professional and built to bring real results: more attention, more trust and more customers.',
  },
  {
    title: 'Our Vision',
    icon: Eye,
    text: 'To be the creative video partner growing brands across Tamil Nadu turn to first, known for content that people stop, watch and remember.',
  },
]

export const values: { title: string; icon: LucideIcon; text: string }[] = [
  {
    title: 'Creativity First',
    icon: Lightbulb,
    text: 'Every brand is different, so every video starts with a fresh idea rather than a template.',
  },
  {
    title: 'Quality in Every Frame',
    icon: Gem,
    text: 'Good light, clean sound, sharp edits. We sweat the details so your brand looks its best.',
  },
  {
    title: 'Honesty & Transparency',
    icon: ShieldCheck,
    text: 'Clear plans, clear communication and no surprises, from the first call to the final file.',
  },
  {
    title: 'On-Time Delivery',
    icon: Timer,
    text: 'Offers and events have dates. We plan around your deadlines and deliver when we say we will.',
  },
  {
    title: 'Client Partnership',
    icon: Handshake,
    text: 'We listen first. Your goals lead the creative, and we treat your brand like our own.',
  },
  {
    title: 'Always Learning',
    icon: Compass,
    text: 'Learn the Art is a promise. We keep improving with new formats, tools and trends.',
  },
]
