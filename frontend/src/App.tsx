import { BrowserRouter, Routes, Route, Link, NavLink } from 'react-router'
import { LayoutDashboard, User, Trees, UserPlus, LogIn, Menu } from 'lucide-react'
import LandingPage from './pages/LandingPage'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import LogTypeBuilder from './pages/LogTypeBuilder'
import LogTypeEntries from './pages/LogTypeEntries'
import CreateEntry from './pages/CreateEntry'
import EditEntry from './pages/EditEntry'
import NotFound from './pages/NotFound'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicOnlyRoute from './auth/PublicOnlyRoute'
import { useAuth } from './auth/AuthContext'
import { useDismissableMenu } from './hooks/useDismissableMenu'
import LogWoodIcon from './components/LogWoodIcon'
import ThemeToggle from './ThemeToggle'
import './App.css'

function Nav() {
  const { isAuthenticated } = useAuth()
  const { open, setOpen, ref } = useDismissableMenu<HTMLDivElement>()

  const navLinks = isAuthenticated ? (
    <>
      <NavLink to="/dashboard" onClick={() => setOpen(false)}>
        <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
      </NavLink>
      <NavLink to="/profile" onClick={() => setOpen(false)}>
        <User size={16} aria-hidden="true" /> Profile
      </NavLink>
    </>
  ) : (
    <>
      <NavLink to="/" onClick={() => setOpen(false)}>
        <Trees size={16} aria-hidden="true" /> Landing
      </NavLink>
      <NavLink to="/signup" onClick={() => setOpen(false)}>
        <UserPlus size={16} aria-hidden="true" /> Sign Up
      </NavLink>
      <NavLink to="/login" onClick={() => setOpen(false)}>
        <LogIn size={16} aria-hidden="true" /> Log In
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
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className={open ? 'nav-menu-list open' : 'nav-menu-list'} role="menu" aria-hidden={!open}>
          {navLinks}
          <ThemeToggle showLabel />
        </div>
      </div>
    </nav>
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/log-types/new" element={<LogTypeBuilder />} />
          <Route path="/log-types/:typeId" element={<LogTypeEntries />} />
          <Route path="/log-types/:typeId/entries/new" element={<CreateEntry />} />
          <Route path="/log-types/:typeId/entries/:createdAt/edit" element={<EditEntry />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
