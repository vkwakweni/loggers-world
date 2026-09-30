import { Link } from 'react-router'
import { Layers, LineChart, ShieldCheck, Bird } from 'lucide-react'
import LogWoodIcon from '../components/LogWoodIcon'
import { isChorusEnabled } from '../chorus'
import { ICON_MD } from '../iconSizes'
import { logTypeIcon, logTypeHue } from '../logTypeStyle'
import type { CSSProperties } from 'react'

const FEATURES = [
  {
    Icon: Layers,
    title: 'Log anything',
    body: 'Books, workouts, recipes, trips. Design your own log types with exactly the fields you care about.',
  },
  {
    Icon: LineChart,
    title: 'See your patterns',
    body: 'Every entry lands on a timeline you own, newest first, ready to edit, filter and revisit.',
  },
  {
    Icon: ShieldCheck,
    title: 'Yours, always',
    body: 'Your data is private to your account, and you can archive or delete any of it in a click.',
  },
]

const PREVIEW = [
  { name: 'Books', fields: 4, entries: 28, last: 'yesterday' },
  { name: 'Workouts', fields: 3, entries: 64, last: 'today' },
  { name: 'Recipes', fields: 5, entries: 12, last: '3 days ago' },
]

function LandingPage() {
  return (
    <div className="landing">
      <section className="hero">
        <LogWoodIcon className="landing-logo" aria-hidden="true" />
        <h1>Logger's World</h1>
        <p className="hero-tagline">A quiet clearing for everything you want to keep track of.</p>
        <div className="landing-actions">
          <Link to="/signup" className="btn btn-primary">
            Start logging
          </Link>
          <Link to="/login" className="btn">
            Log In
          </Link>
        </div>
      </section>

      <ul className="feature-grid">
        {FEATURES.map(({ Icon, title, body }) => (
          <li key={title} className="feature-card">
            <span className="feature-icon">
              <Icon size={ICON_MD} aria-hidden="true" />
            </span>
            <h2>{title}</h2>
            <p>{body}</p>
          </li>
        ))}
      </ul>

      <section className="preview" aria-label="Example dashboard">
        <h2>Your dashboard, your way</h2>
        <ul className="preview-grid" aria-hidden="true">
          {PREVIEW.map(({ name, fields, entries, last }) => {
            const Icon = logTypeIcon(name)
            return (
              <li key={name} className="type-card" style={{ '--hue': logTypeHue(name) } as CSSProperties}>
                <div className="type-card-link">
                  <span className="type-card-icon">
                    <Icon size={ICON_MD} />
                  </span>
                  <span className="type-card-name">{name}</span>
                  <span className="type-card-meta">{fields} fields</span>
                  <span className="type-card-stats">
                    <strong>{entries}</strong> entries · last logged {last}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {isChorusEnabled && (
        <aside className="chorus-teaser-band">
          <Bird size={ICON_MD} aria-hidden="true" />
          <p>
            <strong>Curious about your logs?</strong> Just wonder aloud. Nothing is shared until you say so, and you can switch it off any time.
          </p>
        </aside>
      )}
    </div>
  )
}

export default LandingPage
