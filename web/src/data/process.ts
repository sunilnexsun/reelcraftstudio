import { Clapperboard, Lightbulb, PenTool, Scissors, Send, type LucideIcon } from 'lucide-react'

/** The studio's 5-step process — short text for the home page, full detail for the Process page. */
export interface ProcessStep {
  title: string
  short: string
  icon: LucideIcon
  detail: string
  weDo: string[]
  youDo: string[]
  outcome: string
}

export const processSteps: ProcessStep[] = [
  {
    title: 'Discover',
    short: 'Understand your goals and target audience.',
    icon: Lightbulb,
    detail:
      'Every project starts with a conversation. We learn about your business, your customers and what the video needs to achieve: more walk-ins for an offer, more followers, more enquiries or a stronger brand.',
    weDo: ['Ask about your goals, audience and budget', 'Look at what has worked for you before', 'Suggest the right type of video'],
    youDo: ['Share your offer, product or story', 'Tell us your deadline', 'Send any videos you like as reference'],
    outcome: 'A clear brief we both agree on.',
  },
  {
    title: 'Plan',
    short: 'Develop concepts, scripts, and creative direction.',
    icon: PenTool,
    detail:
      'We turn the brief into a concrete plan, so the shoot day runs smoothly and nothing important is missed.',
    weDo: ['Write the concept, hook and script or talking points', 'Prepare a shot list', 'Fix the location, people and schedule'],
    youDo: ['Review and approve the plan', 'Arrange access to your store, venue or products'],
    outcome: 'An approved plan and a confirmed shoot date.',
  },
  {
    title: 'Shoot',
    short: 'Capture your story with the right visuals.',
    icon: Clapperboard,
    detail:
      'On shoot day our team sets up camera, lighting and sound at your location and captures every planned shot, plus extra footage that gives the edit room to breathe.',
    weDo: ['Set up camera, lights and audio', 'Direct presenters, staff and products', 'Capture planned shots and extra coverage'],
    youDo: ['Keep the location ready', 'Have products and people available'],
    outcome: 'All the footage the edit needs.',
  },
  {
    title: 'Edit',
    short: 'Refine with editing, sound, and finishing touches.',
    icon: Scissors,
    detail:
      'This is where the story comes together. We cut the footage, add music, text, offer graphics and captions, balance the colour and sound, then share a draft for your feedback.',
    weDo: ['Cut the story and pace it for the platform', 'Add music, text, graphics and captions', 'Make changes based on your feedback'],
    youDo: ['Watch the draft', 'Send clear feedback in one message'],
    outcome: 'A final cut you are happy with.',
  },
  {
    title: 'Deliver',
    short: 'Provide final content in the agreed formats.',
    icon: Send,
    detail:
      'You receive finished, high-quality files in every format agreed at the start, ready to post, share or run as ads.',
    weDo: ['Export every agreed format and size', 'Provide a cover image and caption ideas', 'Share the files digitally'],
    youDo: ['Post and share your video', 'Tell us how it performed so we can plan the next one'],
    outcome: 'Ready-to-post videos for every platform.',
  },
]

export const deliveryFormats = [
  { label: 'Vertical 9:16', use: 'Instagram Reels, YouTube Shorts, WhatsApp status' },
  { label: 'Horizontal 16:9', use: 'YouTube, websites, in-store screens' },
  { label: 'Square 1:1', use: 'Instagram and Facebook feed posts' },
  { label: 'Short cut-downs', use: '15, 30 and 60 second versions for ads' },
  { label: 'Cover images', use: 'Thumbnails for your grid and YouTube' },
  { label: 'Captions', use: 'On-screen text for viewers watching on mute' },
]
