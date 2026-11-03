import { Crown, Fan, Flower2, Gem, Popcorn, Shirt, ShoppingBag, Smartphone, Sofa, Sparkles, Store, Sun, Trophy, Utensils, type LucideIcon } from 'lucide-react'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PORTFOLIO — the studio's work.
 *  Videos live in /public/videos (compressed 720p H.264 MP4 + a WebP poster).
 *  To add a project: drop `name.mp4` and `name.webp` into /public/videos and
 *  add an entry below. Only categories that have at least one project show
 *  as filter buttons.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const portfolioCategories = [
  'All Work',
  'Instagram Reels',
  'Product Videos',
  'Promotional Videos',
  'Brand Films',
] as const

export type PortfolioCategory = Exclude<(typeof portfolioCategories)[number], 'All Work'>

export interface Project {
  id: string
  title: string
  /** Short line under the title, e.g. client type or location. */
  client?: string
  category: PortfolioCategory
  /** e.g. '00:45' — only show if known. */
  duration?: string
  /** Short line shown in the preview modal. */
  summary: string
  /** Poster/thumbnail image (lazy-loaded). Falls back to a styled placeholder. */
  thumbnail?: string
  /** YouTube / Vimeo URL or a self-hosted .mp4/.webm path. Loaded only when the modal opens. */
  videoUrl?: string
  /** 'portrait' for 9:16 reels, 'landscape' for 16:9 films. */
  orientation: 'portrait' | 'landscape'
  /** Icon + tint used by the placeholder thumbnail when no image is supplied. */
  icon: LucideIcon
  tone: PlaceholderTone
  /** true = illustrative entry, labelled "Sample" on the site. */
  isSample: boolean
}






export type PlaceholderTone = 'ember' | 'crimson' | 'amber' | 'rose' | 'steel' | 'violet'

// Relative to the site root, so they work wherever the site is hosted.
const v = (name: string) => `${import.meta.env.BASE_URL}videos/${name}`

export const projects: Project[] = [
  {
    id: 'ruvas-beauty-salon',
    title: 'Ruva’s Beauty Salon',
    client: 'Beauty salon',
    category: 'Promotional Videos',
    duration: '01:20',
    summary:
      'Service showcase for Ruva’s beauty salon: a presenter-led tour of the salon with treatments such as micro-dermabrasion facials and ear lobe correction filmed in action.',
    thumbnail: v('ruvas-beauty-salon.webp'),
    videoUrl: v('ruvas-beauty-salon.mp4'),
    orientation: 'portrait',
    icon: Flower2,
    tone: 'rose',
    isSample: false,
  },
  {
    id: 'thangamayil-jewellery',
    title: 'Thangamayil Jewellery',
    client: 'Panguni festival offer',
    category: 'Promotional Videos',
    duration: '00:54',
    summary:
      'Festival offer promo for Thangamayil Jewellery in Sivakasi, featuring gold and diamond collections in the showroom with discount details on screen.',
    thumbnail: v('thangamayil-jewellery.webp'),
    videoUrl: v('thangamayil-jewellery.mp4'),
    orientation: 'portrait',
    icon: Gem,
    tone: 'amber',
    isSample: false,
  },
  {
    id: 'pommys-fashion',
    title: 'Pommys Fashion',
    client: 'Women’s wear store',
    category: 'Instagram Reels',
    duration: '00:43',
    summary:
      'Store reel for Pommys Fashion women’s wear: kurtis, nightwear and dresses modelled in store, with the shop front and phone number at the end.',
    thumbnail: v('pommys-fashion.webp'),
    videoUrl: v('pommys-fashion.mp4'),
    orientation: 'portrait',
    icon: Shirt,
    tone: 'violet',
    isSample: false,
  },
  {
    id: 'vrb-expo',
    title: 'VRB Expo',
    client: 'Fashion & lifestyle exhibition',
    category: 'Promotional Videos',
    duration: '00:52',
    summary:
      'Event promo for the VRB fashion, style and décor expo: a presenter-led walk through the stalls, from sarees and kids’ wear to accessories and skincare, with dates on screen.',
    thumbnail: v('vrb-expo.webp'),
    videoUrl: v('vrb-expo.mp4'),
    orientation: 'portrait',
    icon: Store,
    tone: 'rose',
    isSample: false,
  },
  {
    id: 'face-arts',
    title: 'Face Arts',
    client: 'Makeup studio & rental jewellery',
    category: 'Product Videos',
    duration: '01:10',
    summary:
      'New Year offer reel for Face Arts makeup studio, showcasing bridal and temple rental jewellery sets with the offer dates on screen.',
    thumbnail: v('face-arts.webp'),
    videoUrl: v('face-arts.mp4'),
    orientation: 'portrait',
    icon: Crown,
    tone: 'crimson',
    isSample: false,
  },
  {
    id: 'fb-interiors-restaurant',
    title: 'FB Interiors: Restaurant',
    client: 'Interior design walkthrough',
    category: 'Brand Films',
    duration: '01:46',
    summary:
      'Designer-led walkthrough of a restaurant interior by FB Interiors, explaining the materials and design choices behind each space.',
    thumbnail: v('fb-interiors-restaurant.webp'),
    videoUrl: v('fb-interiors-restaurant.mp4'),
    orientation: 'portrait',
    icon: Sofa,
    tone: 'rose',
    isSample: false,
  },
  {
    id: 'fb-interiors-turf',
    title: 'FB Interiors: Sports Turf',
    client: 'Turf & arena project',
    category: 'Brand Films',
    duration: '00:37',
    summary:
      'Night-time showcase of a sports turf built by FB Interiors: floodlit pitch, netting and seating, introduced by the designer on the field.',
    thumbnail: v('fb-interiors-turf.webp'),
    videoUrl: v('fb-interiors-turf.mp4'),
    orientation: 'portrait',
    icon: Trophy,
    tone: 'steel',
    isSample: false,
  },
  {
    id: 'sri-meenakshi-fan-house',
    title: 'Sri Meenakshi Fan House',
    client: 'Appliance showroom',
    category: 'Instagram Reels',
    duration: '01:10',
    summary:
      'Offer-led showroom reel walking customers through kitchen appliances, mobiles, fridges and washing machines, with purchase offers on screen.',
    thumbnail: v('sri-meenakshi-fan-house.webp'),
    videoUrl: v('sri-meenakshi-fan-house.mp4'),
    orientation: 'portrait',
    icon: Fan,
    tone: 'ember',
    isSample: false,
  },
  {
    id: 'ibu-catering-taste',
    title: 'Ibu Catering Service',
    client: 'Food tasting review',
    category: 'Brand Films',
    duration: '01:55',
    summary:
      'Food review film for Ibu Catering Service in Sivakasi: biryani cooked in the kitchen, served on banana leaf and reviewed by guests on camera.',
    thumbnail: v('ibu-catering-taste.webp'),
    videoUrl: v('ibu-catering-taste.mp4'),
    orientation: 'portrait',
    icon: Utensils,
    tone: 'amber',
    isSample: false,
  },
  {
    id: 'ipl-combo',
    title: 'Perfect IPL Combo',
    client: 'Mittai Kadai × Sense Connect',
    category: 'Brand Films',
    duration: '00:45',
    summary:
      'Co-branded ad for M.S. Shanmuganadar Mittai Kadai and Sense Connect fibre internet: friends watching the IPL with non-stop streams and non-stop snacks.',
    thumbnail: v('ipl-combo-mittai-kadai-sense-connect.webp'),
    videoUrl: v('ipl-combo-mittai-kadai-sense-connect.mp4'),
    orientation: 'portrait',
    icon: Popcorn,
    tone: 'violet',
    isSample: false,
  },
  {
    id: 'solarich-green-power',
    title: 'Solarich Green Power',
    client: 'Solar installation',
    category: 'Promotional Videos',
    duration: '00:38',
    summary:
      'Presenter-led promo for a rooftop solar installer, explaining the PM Surya Ghar scheme with real installation footage and contact numbers on screen.',
    thumbnail: v('solarich-green-power.webp'),
    videoUrl: v('solarich-green-power.mp4'),
    orientation: 'portrait',
    icon: Sun,
    tone: 'amber',
    isSample: false,
  },
  {
    id: 'chennai-silks-expo',
    title: 'The Chennai Silks Expo',
    client: 'Sivakasi',
    category: 'Promotional Videos',
    duration: '00:43',
    summary: 'Promotional reel announcing The Chennai Silks special sale exhibition in Sivakasi, with dates, venue and offers.',
    thumbnail: v('chennai-silks-expo.webp'),
    videoUrl: v('chennai-silks-expo.mp4'),
    orientation: 'portrait',
    icon: ShoppingBag,
    tone: 'violet',
    isSample: false,
  },
  {
    id: 'srikumaran',
    title: 'Srikumaran',
    client: 'Jewellery showroom',
    category: 'Product Videos',
    duration: '00:43',
    summary: 'Showroom reel featuring diamond jewellery collections, including close-up product shots of the pendant range.',
    thumbnail: v('srikumaran.webp'),
    videoUrl: v('srikumaran.mp4'),
    orientation: 'portrait',
    icon: Gem,
    tone: 'steel',
    isSample: false,
  },
  {
    id: 'satya-mobiles',
    title: 'Satya Mobiles',
    client: 'Rajapalayam',
    category: 'Instagram Reels',
    duration: '01:10',
    summary: 'Offer-led store reel for Satya Mobiles, highlighting festive deals on phones, accessories and air conditioners.',
    thumbnail: v('satya-mobiles.webp'),
    videoUrl: v('satya-mobiles.mp4'),
    orientation: 'portrait',
    icon: Smartphone,
    tone: 'crimson',
    isSample: false,
  },
  {
    id: 'jewellery-store',
    title: 'Gold Jewellery Showcase',
    client: 'Jewellery store',
    category: 'Instagram Reels',
    duration: '00:38',
    summary: 'Festive store reel showing the gold jewellery range and the in-store shopping experience.',
    thumbnail: v('jewellery-store.webp'),
    videoUrl: v('jewellery-store.mp4'),
    orientation: 'portrait',
    icon: Sparkles,
    tone: 'amber',
    isSample: false,
  },
]
