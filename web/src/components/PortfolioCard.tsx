import { Play } from 'lucide-react'
import type { Project } from '../data/portfolio'
import { PlaceholderArt } from './PlaceholderArt'

interface PortfolioCardProps {
  project: Project
  onOpen: (project: Project) => void
}

export function PortfolioCard({ project, onOpen }: PortfolioCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      aria-haspopup="dialog"
      aria-label={`Play ${project.title} — ${project.category}${project.isSample ? ' (sample project)' : ''}`}
      className="group block w-full text-left"
    >
      <div className={`relative ${project.orientation === 'portrait' ? 'aspect-[9/14]' : 'aspect-[16/10]'} overflow-hidden rounded-[12px] ring-1 ring-white/10 transition-[box-shadow] duration-300 group-hover:ring-brand/70`}>
        <div className="h-full w-full transition-transform duration-500 group-hover:scale-[1.05] motion-reduce:group-hover:scale-100">
          <PlaceholderArt
            icon={project.icon}
            tone={project.tone}
            image={project.thumbnail}
            alt={`${project.title} video thumbnail`}
            label={project.isSample ? 'Sample' : undefined}
            iconPlacement="corner"
          />
        </div>
        {/* hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white/90 bg-black/40 text-white backdrop-blur-sm transition-[background-color,transform] duration-300 group-hover:scale-110 group-hover:border-brand group-hover:bg-brand motion-reduce:group-hover:scale-100">
          <Play className="ml-0.5 h-5 w-5 fill-current" aria-hidden />
        </span>
        {project.duration && (
          <span className="absolute bottom-2.5 right-2.5 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[0.7rem] text-white">
            {project.duration}
          </span>
        )}
      </div>
      <h3 className="mt-3 font-display text-[0.95rem] font-bold text-white transition-colors group-hover:text-brand">
        {project.title}
      </h3>
      <p className="mt-0.5 text-[0.8rem] text-white/55">
        {project.category}
        {project.client && <span className="text-white/40"> · {project.client}</span>}
      </p>
    </button>
  )
}
