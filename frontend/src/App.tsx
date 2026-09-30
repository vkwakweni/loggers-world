import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router'
import { LayoutDashboard, User, Trees, UserPlus, LogIn, Menu, Bird } from 'lucide-react'
import LandingPage from './pages/LandingPage'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import LogTypeBuilder from './pages/LogTypeBuilder'
import LogTypeEntries from './pages/LogTypeEntries'
import CreateEntry from './pages/CreateEntry'
import EditEntry from './pages/EditEntry'
import Chorus from './pages/Chorus'
import NotFound from './pages/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicOnlyRoute from './auth/PublicOnlyRoute'
import { useAuth } from './auth/AuthContext'
import { useDismissableMenu } from './hooks/useDismissableMenu'
import LogWoodIcon from './components/LogWoodIcon'
import ThemeToggle from './ThemeToggle'
import { ICON_SM, ICON_MD } from './iconSizes'
import { isChorusEnabled } from './chorus'
import './App.css'

function Nav() {
  const { isAuthenticated } = useAuth()
  const { open, setOpen, ref } = useDismissableMenu<HTMLDivElement>()

  const navLinks = isAuthenticated ? (
    <>
      <NavLink to="/dashboard" onClick={() => setOpen(false)}>
        <LayoutDashboard size={ICON_SM} aria-hidden="true" /> Dashboard
      </NavLink>
      {isChorusEnabled && (
        <NavLink to="/wonder" onClick={() => setOpen(false)}>
          <Bird size={ICON_SM} aria-hidden="true" /> Wonder
        </NavLink>
      )}
      <NavLink to="/profile" onClick={() => setOpen(false)}>
        <User size={ICON_SM} aria-hidden="true" /> Profile
      </NavLink>
    </>
  ) : (
    <>
      <NavLink to="/" onClick={() => setOpen(false)}>
        <Trees size={ICON_SM} aria-hidden="true" /> Landing
      </NavLink>
      <NavLink to="/signup" onClick={() => setOpen(false)}>
        <UserPlus size={ICON_SM} aria-hidden="true" /> Sign Up
      </NavLink>
      <NavLink to="/login" onClick={() => setOpen(false)}>
        <LogIn size={ICON_SM} aria-hidden="true" /> Log In
      </NavLink>
    </>
  )

  return (
    <nav>
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="brand" onClick={() => setOpen(false)}>
        <LogWoodIcon aria-hidden="true" className="brand-icon" />
        Logger's World
      </Link>
      <div className="nav-links">
        {navLinks}
        <ThemeToggle />
      </div>
      <div className="nav-menu" ref={ref}>
        <button
          type="button"
          className="btn-icon"
          aria-label="Menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <Menu size={ICON_MD} aria-hidden="true" />
        </button>
        <div className={open ? 'nav-menu-list open' : 'nav-menu-list'} role="menu" aria-hidden={!open}>
          {navLinks}
          <ThemeToggle showLabel />
        </div>
      </div>
    </nav>
  )
}

function Footer() {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return null

  return (
    <footer className="site-footer">
      <span className="footer-brand">
        <LogWoodIcon aria-hidden="true" className="brand-icon" />
        Logger's World
      </span>
      <span>
        Made by Vuyo Kwakweni · <a href="https://github.com/vkwakweni/loggers-world">Source on GitHub</a> ·{' '}
        <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm Noncommercial</a>
      </span>
    </footer>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/wonder" element={<Chorus />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/log-types/new" element={<LogTypeBuilder />} />
          <Route path="/log-types/:typeId" element={<LogTypeEntries />} />
          <Route path="/log-types/:typeId/entries/new" element={<CreateEntry />} />
          <Route path="/log-types/:typeId/entries/:createdAt/edit" element={<EditEntry />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App
