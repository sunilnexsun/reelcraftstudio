import { useCallback, useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { Header } from './sections/Header'
import { Hero } from './sections/Hero'
import { StatsBar } from './sections/StatsBar'
import { ServicesSection } from './sections/ServicesSection'
import { PortfolioSection } from './sections/PortfolioSection'
import { AboutSection } from './sections/AboutSection'
import { ProcessSection } from './sections/ProcessSection'
import { TestimonialsSection } from './sections/TestimonialsSection'
import { ContactSection } from './sections/ContactSection'
import { Footer } from './sections/Footer'
import { ServicePage } from './pages/ServicePage'
import { ServicesPage } from './pages/ServicesPage'
import { PortfolioPage } from './pages/PortfolioPage'
import { AboutPage } from './pages/AboutPage'
import { ProcessPage } from './pages/ProcessPage'
import { ContactPage } from './pages/ContactPage'
import { VideoModal, type ModalMedia } from './components/VideoModal'
import { BackToTop } from './components/BackToTop'
import { showreel } from './data/site'
import { getService } from './data/services'
import type { Project } from './data/portfolio'
import { navIdFor, scrollToAnchor, useRoute, type PageName } from './lib/router'

const SITE = 'Reel Craft Studio, Sivakasi'
const HOME_TITLE = 'Reel Craft Studio | Video Production & Creative Content'
const PAGE_TITLES: Record<PageName, string> = {
  services: `Our Services | ${SITE}`,
  portfolio: `Portfolio | ${SITE}`,
  about: `About Us | ${SITE}`,
  process: `Our Process | ${SITE}`,
  contact: `Contact & Book a Shoot | ${SITE}`,
}

export default function App() {
  const route = useRoute()
  const [media, setMedia] = useState<ModalMedia | null>(null)
  const close = useCallback(() => setMedia(null), [])

  const service = route.name === 'service' ? getService(route.slug) : undefined
  // An unknown service slug falls back to the home page.
  const view = service ? 'service' : route.name === 'page' ? route.page : 'home'

  // Page title + scroll position on every route change.
  useEffect(() => {
    document.title = service ? `${service.title} | ${SITE}` : view === 'home' ? HOME_TITLE : PAGE_TITLES[view as PageName]
    if (view !== 'home') window.scrollTo(0, 0)
    else if (route.name === 'home' && route.anchor) scrollToAnchor(route.anchor)
    else window.scrollTo(0, 0)
  }, [route, service, view])

  const openShowreel = () => setMedia({ title: showreel.title, videoUrl: showreel.url || undefined })

  const openProject = (p: Project) =>
    setMedia({
      title: p.title,
      subtitle: p.client ? `${p.category} · ${p.client}` : p.category,
      description: p.summary,
      videoUrl: p.videoUrl,
      poster: p.thumbnail,
      isSample: p.isSample,
      orientation: p.orientation,
    })

  const page = (() => {
    if (service) return <ServicePage key={service.slug} service={service} onOpenProject={openProject} />
    switch (view) {
      case 'services':
        return <ServicesPage />
      case 'portfolio':
        return <PortfolioPage onOpenProject={openProject} />
      case 'about':
        return <AboutPage />
      case 'process':
        return <ProcessPage />
      case 'contact':
        return <ContactPage />
      default:
        return (
          <>
            <Hero onWatchShowreel={openShowreel} />
            <StatsBar />
            <ServicesSection />
            <PortfolioSection onOpenProject={openProject} />
            <AboutSection />
            <ProcessSection />
            <TestimonialsSection />
            <ContactSection />
          </>
        )
    }
  })()

  return (
    // reducedMotion="user" → Framer Motion skips transform animations for prefers-reduced-motion users
    <MotionConfig reducedMotion="user">
      <Header activeId={service ? 'services' : navIdFor(route)} />
      <main id="main" key={view + (service?.slug ?? '')}>
        {page}
      </main>
      <Footer />
      <BackToTop />
      <VideoModal media={media} onClose={close} />
    </MotionConfig>
  )
}
