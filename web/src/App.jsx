import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, BarChart3, Satellite, Settings, Sprout } from 'lucide-react'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import DemandIntel from './pages/DemandIntel'
import FarmMonitor from './pages/FarmMonitor'
import SettingsPage from './pages/Settings'
import LanguageSwitcher from './components/LanguageSwitcher'

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/demand', icon: BarChart3, labelKey: 'nav.demand' },
  { path: '/farm', icon: Satellite, labelKey: 'nav.farm' },
  { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
]

function AppLayout({ children }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Sprout className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">{t('app.name')}</span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Main content */}
      <main className="flex-1 w-full relative">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="bg-card border-t border-border px-2 py-2 flex items-center justify-around sticky bottom-0 z-50 lg:hidden">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Side nav (desktop) */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-16 bg-card border-r border-border flex-col items-center pt-20 gap-2 z-40">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            title={t(labelKey)}
            className={({ isActive }) =>
              `w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
              }`
            }
          >
            <Icon className="w-5 h-5" />
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function RequireFarmer({ children }) {
  const farmerId = localStorage.getItem('agripulse-farmerId')
  if (!farmerId) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const isOnboarding = location.pathname === '/onboarding'

  if (isOnboarding) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <AppLayout>
      <div className="lg:ml-16">
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<RequireFarmer><Dashboard /></RequireFarmer>} />
          <Route path="/demand" element={<RequireFarmer><DemandIntel /></RequireFarmer>} />
          <Route path="/farm" element={<RequireFarmer><FarmMonitor /></RequireFarmer>} />
          <Route path="/settings" element={<RequireFarmer><SettingsPage /></RequireFarmer>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </AppLayout>
  )
}
