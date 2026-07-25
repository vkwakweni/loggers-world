import { BrowserRouter, Routes, Route, NavLink } from 'react-router'
import { LayoutDashboard, User, Trees, UserPlus, LogIn } from 'lucide-react'
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
import ThemeToggle from './ThemeToggle'
import './App.css'

function Nav() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <nav>
        <NavLink to="/dashboard">
          <LayoutDashboard size={16} aria-hidden="true" /> Dashboard
        </NavLink>
        <NavLink to="/profile">
          <User size={16} aria-hidden="true" /> Profile
        </NavLink>
        <ThemeToggle />
      </nav>
    )
  }

  return (
    <nav>
      <NavLink to="/">
        <Trees size={16} aria-hidden="true" /> Landing
      </NavLink>
      <NavLink to="/signup">
        <UserPlus size={16} aria-hidden="true" /> Sign Up
      </NavLink>
      <NavLink to="/login">
        <LogIn size={16} aria-hidden="true" /> Log In
      </NavLink>
      <ThemeToggle />
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
