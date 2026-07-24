import { BrowserRouter, Routes, Route, Link } from 'react-router'
import LandingPage from './pages/LandingPage'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import LogTypeBuilder from './pages/LogTypeBuilder'
import LogTypeEntries from './pages/LogTypeEntries'
import CreateEntry from './pages/CreateEntry'
import EditEntry from './pages/EditEntry'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicOnlyRoute from './auth/PublicOnlyRoute'
import { useAuth } from './auth/AuthContext'
import './App.css'

function Nav() {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <nav>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/profile">Profile</Link>
      </nav>
    )
  }

  return (
    <nav>
      <Link to="/">Landing</Link>
      <Link to="/signup">Sign Up</Link>
      <Link to="/login">Log In</Link>
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
          <Route path="/log-types/:typeId/entries/:entryId/edit" element={<EditEntry />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
