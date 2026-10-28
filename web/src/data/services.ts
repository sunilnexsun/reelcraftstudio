import { Clapperboard, Smartphone, PackageOpen, Share2, UserRound, type LucideIcon } from 'lucide-react'
import type { PortfolioCategory } from './portfolio'

import shoot1 from '../assets/services/shoot-1.webp'
import shoot2 from '../assets/services/shoot-2.webp'
import shoot3 from '../assets/services/shoot-3.webp'
import reels1 from '../assets/services/reels-1.webp'
import reels2 from '../assets/services/reels-2.webp'
import reels3 from '../assets/services/reels-3.webp'
import product1 from '../assets/services/product-1.webp'
import product2 from '../assets/services/product-2.webp'
import product3 from '../assets/services/product-3.webp'
import social1 from '../assets/services/social-1.webp'
import social2 from '../assets/services/social-2.webp'
import social3 from '../assets/services/social-3.webp'
import personal1 from '../assets/services/personal-1.webp'
import personal2 from '../assets/services/personal-2.webp'
import personal3 from '../assets/services/personal-3.webp'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SERVICES — used by the home page cards and the /services/<slug> pages.
 *  Images are stills from the studio's own client reels (src/assets/services).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface ServiceImage {
  src: string
  alt: string
}

export interface Service {
  /** URL slug — the page lives at /services/<slug>. */
  slug: string
  title: string
  /** Short card description (home page). */
  description: string
  /** One-line promise shown under the page title. */
  tagline: string
  /** Opening paragraphs on the service page. */
  intro: string[]
  icon: LucideIcon
  /** First image is the card + page cover; the rest form the page gallery. */
  images: [ServiceImage, ...ServiceImage[]]
  /** What the client gets. */
  includes: string[]
  /** Types of business this suits. */
  idealFor: string[]
  /** How this particular service runs, step by step. */
  steps: { title: string; text: string }[]
  /** Portfolio categories shown as "related work". Empty = show everything. */
  relatedCategories: PortfolioCategory[]
}

export const services: Service[] = [
  {
    slug: 'video-shooting-editing',
    title: 'Video Shooting & Editing',
    description:
      'Professional video production, cinematic shots, and polished editing to bring your ideas to life.',
    tagline: 'Cinematic shoots and clean, story-driven edits.',
    intro: [
      'We plan, shoot and edit videos that look professional and suit your brand. Store openings, events, interviews, presenter-led promos or brand films: we handle the camera work, lighting and sound on location, then shape the footage into a polished final cut.',
      'Every shoot starts with a clear plan, so the day runs smoothly and we capture exactly the shots the edit needs.',
    ],
    icon: Clapperboard,
    images: [
      { src: shoot1, alt: 'Presenter filmed on location beside a Sivakasi road sign for a Chennai Silks promotion' },
      { src: shoot2, alt: 'Presenter speaking to camera outdoors with an on-screen offer caption' },
      { src: shoot3, alt: 'Presenter filmed inside a jewellery showroom' },
    ],
    includes: [
      'Pre-shoot planning, concept and shot list',
      'On-location shooting with camera, lighting and audio setup',
      'Direction for presenters and staff on camera',
      'Editing, colour correction and sound clean-up',
      'Titles, text overlays, captions and logo animation',
      'Background music and voice-over syncing',
      'Exports for Instagram, YouTube, WhatsApp and websites',
    ],
    idealFor: ['Shops & showrooms', 'Events & exhibitions', 'Schools & institutions', 'Factories & businesses', 'Brand launches'],
    steps: [
      { title: 'Brief & plan', text: 'We discuss your goal, audience and key message, then prepare a concept and shot list.' },
      { title: 'Shoot day', text: 'Our team sets up on location and captures every planned shot, plus extra footage for the edit.' },
      { title: 'Edit & review', text: 'We cut the story, add graphics, music and colour, and share a draft for your feedback.' },
      { title: 'Final delivery', text: 'You receive the finished video in every format you need, ready to publish.' },
    ],
    relatedCategories: [],
  },
  {
    slug: 'instagram-reels',
    title: 'Instagram Reels',
    description:
      'Creative short-form videos designed to grab attention, showcase your brand, and engage your audience.',
    tagline: 'Short, scroll-stopping videos made for the feed.',
    intro: [
      'Reels are one of the fastest ways for a local business to reach new customers. We script, shoot and edit vertical videos with a strong opening hook, clear on-screen offers and a fast pace, so your products, deals and store come across in under a minute.',
      'Presenter-led reels like our Satya Mobiles and Chennai Silks work show the store, the offer and the location in one short video your customers can share.',
    ],
    icon: Smartphone,
    images: [
      { src: reels1, alt: 'Presenter in a mobile shop with an on-screen sound bar offer' },
      { src: reels2, alt: 'Presenter showing air conditioners in an electronics store' },
      { src: reels3, alt: 'Presenter with a dated offer caption in a mobile store' },
    ],
    includes: [
      'Concept, hook and script writing',
      'Presenter-led or product-led reel formats',
      'Vertical 9:16 shooting in your store or location',
      'Fast-paced editing with offer text and captions',
      'Music, sound effects and transitions',
      'Cover frame for your Instagram grid',
      'Ready-to-post files for Instagram, Facebook and YouTube Shorts',
    ],
    idealFor: ['Retail stores', 'Jewellery & textiles', 'Mobile & electronics shops', 'Restaurants & cafés', 'Personal brands'],
    steps: [
      { title: 'Idea & hook', text: 'We pick the offer or story and write a hook that grabs attention in the first seconds.' },
      { title: 'Quick shoot', text: 'A focused shoot at your store, often with a presenter walking customers through the offer.' },
      { title: 'Snappy edit', text: 'Tight cuts, bold text, captions and music, built for viewers watching on mute or with sound.' },
      { title: 'Post-ready', text: 'You get the final reel and cover image, ready to upload and boost.' },
    ],
    relatedCategories: ['Instagram Reels', 'Promotional Videos'],
  },
  {
    slug: 'product-promotional-videos',
    title: 'Product & Promotional Videos',
    description:
      'Make your products and services stand out with compelling promotional videos created for your target audience.',
    tagline: 'Show your products at their best and announce your offers.',
    intro: [
      'From close-up product shots to sale and launch announcements, we create videos that make products look their best and give customers a clear reason to visit or buy.',
      'We light products carefully, capture the details that matter, like the sparkle of a diamond pendant or the finish of a gold chain, and present prices, dates and locations clearly.',
    ],
    icon: PackageOpen,
    images: [
      { src: product1, alt: 'Close-up of a diamond pendant on a dark background' },
      { src: product2, alt: 'Gold jewellery trays being presented in a showroom' },
      { src: product3, alt: 'Wireless earbuds product shot with an on-screen price' },
    ],
    includes: [
      'In-store or table-top product shoots',
      'Close-up detail and macro shots',
      'Sale, offer and launch announcement videos',
      'Expo and exhibition promotions',
      'Price, date and location graphics',
      'Short cut-downs for ads, such as 15, 30 and 60 seconds',
      'Versions for social media, WhatsApp status and in-store screens',
    ],
    idealFor: ['Jewellery showrooms', 'Textiles & fashion', 'Electronics', 'Manufacturers & products', 'Expos & exhibitions'],
    steps: [
      { title: 'Product brief', text: 'We note the products, offers and details customers need to see.' },
      { title: 'Styling & light', text: 'Products are arranged and lit to show texture, shine and colour accurately.' },
      { title: 'Shoot & capture', text: 'Wide, detail and close-up shots, plus presenter pieces if the promo needs them.' },
      { title: 'Promo edit', text: 'We combine shots, offer graphics and music into a clear, persuasive video.' },
    ],
    relatedCategories: ['Product Videos', 'Promotional Videos'],
  },
  {
    slug: 'social-media-content',
    title: 'Social Media Content',
    description:
      'Content planning, creative production, and video-focused social media support to maintain a consistent brand presence.',
    tagline: 'Consistent video content that keeps your brand visible.',
    intro: [
      'Posting regularly builds recognition. We help you plan content around your products, festivals and offers, then produce videos in batches so your pages stay active and look consistent.',
      'Instead of one-off videos, you get a steady flow of reels and posts in a style customers start to recognise as yours.',
    ],
    icon: Share2,
    images: [
      { src: social1, alt: 'Festive character presenter in a jewellery store reel' },
      { src: social2, alt: 'Presenter in a jewellery showroom in a traditional saree' },
      { src: social3, alt: 'Chennai Silks exhibition poster with dates and venue details' },
    ],
    includes: [
      'Monthly content planning around festivals and offers',
      'Batch shooting days to create several videos at once',
      'Reels, stories and short video posts',
      'Consistent brand style: colours, fonts and logo',
      'Caption and hashtag suggestions',
      'Festival and seasonal campaign content',
      'Files organised and ready to schedule',
    ],
    idealFor: ['Growing local brands', 'Multi-branch stores', 'Schools & institutions', 'Personal brands'],
    steps: [
      { title: 'Content plan', text: 'We map out the month: offers, festivals, new arrivals and stories to tell.' },
      { title: 'Batch shoot', text: 'One shoot day captures footage for several posts and reels.' },
      { title: 'Produce & brand', text: 'Each video is edited in your brand style with captions and graphics.' },
      { title: 'Ready to post', text: 'Videos arrive in order with caption ideas, ready for your posting schedule.' },
    ],
    relatedCategories: [],
  },
  {
    slug: 'personal-branding',
    title: 'Personal Branding',
    description:
      'Videos that build your personal brand as a founder, professional or creator, so people know, like and trust you.',
    tagline: 'Show up on camera with confidence and a clear message.',
    intro: [
      'People buy from people. Personal branding videos help business owners, doctors, coaches, educators and creators share their expertise, story and personality in a way that builds trust over time.',
      'We help you work out what to say, guide you in front of the camera, and edit everything into content that sounds and looks like you, even if you have never been on camera before.',
    ],
    icon: UserRound,
    images: [
      { src: personal1, alt: 'Presenter speaking confidently to camera outdoors' },
      { src: personal2, alt: 'Presenter introducing herself to camera inside a showroom' },
      { src: personal3, alt: 'Presenter talking to camera while walking through a store' },
    ],
    includes: [
      'Brand discovery session to define your story and message',
      'Content ideas, talking points and simple scripts',
      'On-camera coaching and direction during the shoot',
      'Introduction and “about me” videos',
      'Expertise, tips and behind-the-scenes videos',
      'Short intro videos for your profiles and website',
      'A consistent look across Instagram, YouTube and LinkedIn',
    ],
    idealFor: ['Founders & business owners', 'Doctors & professionals', 'Coaches & educators', 'Creators & influencers', 'Artists & performers'],
    steps: [
      { title: 'Discover your story', text: 'We talk about who you are, who you want to reach and what you want to be known for.' },
      { title: 'Plan your content', text: 'We turn that into a list of video ideas with simple talking points, so you never face a blank page.' },
      { title: 'Guided shoot', text: 'A relaxed shoot where we direct you, so you look and sound natural on camera.' },
      { title: 'Edit & publish', text: 'Clean edits with captions and your brand style, ready to post on your profiles.' },
    ],
    relatedCategories: [],
  },
]

export function getService(slug: string) {
  return services.find((s) => s.slug === slug)
}

/** Options for the enquiry form's "Service interested in" select. */
export const serviceOptions = [...services.map((s) => s.title), 'Other']

/** General questions shown on every service page. */
export const serviceFaqs = [
  {
    q: 'What do I need to prepare before the shoot?',
    a: 'Just your goals and the products, offers or people you want to feature. We share a simple plan beforehand so you know what to keep ready on the day.',
  },
  {
    q: 'Which video formats will I receive?',
    a: 'We agree the formats at the start: vertical 9:16 for Reels, Shorts and WhatsApp status, 16:9 for YouTube and screens, or square for feed posts.',
  },
  {
    q: 'Can you shoot at my shop, office or event?',
    a: 'Yes. Most of our work is shot on location, in stores, showrooms, venues and outdoors. Tell us where and we will plan around it.',
  },
  {
    q: 'How do I get a quote?',
    a: 'Send an enquiry or message us on WhatsApp with what you need. We will reply with options based on your project.',
  },
]
