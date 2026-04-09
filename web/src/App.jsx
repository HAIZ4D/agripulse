import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, BarChart3, Satellite, Settings, Sprout, Search, Bell, User } from 'lucide-react'
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
  const farmerName = localStorage.getItem('agripulse-farmerName') || ''

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border flex-col z-50">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3 border-b border-border/50">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Sprout className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-base text-foreground leading-tight block">AgriPulse</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground leading-tight">Smart Agriculture</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, icon: Icon, labelKey }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{t(labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer — User */}
        {farmerName && (
          <div className="px-4 py-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{farmerName}</p>
                <p className="text-[10px] text-muted-foreground">{t('dashboard.farmer')}</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Area */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="bg-card/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          {/* Mobile Logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sprout className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-base">{t('app.name')}</span>
          </div>

          {/* Search (desktop) */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('dashboard.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/40 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:bg-muted/60 transition-all"
              />
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2.5">
            <LanguageSwitcher />
            <button className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2">
              {farmerName && (
                <span className="hidden sm:block text-xs font-semibold text-foreground">{farmerName.split(' ')[0]}</span>
              )}
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center cursor-pointer">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 w-full relative pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="lg:hidden bg-card/90 backdrop-blur-xl border-t border-border px-2 py-2 flex items-center justify-around fixed bottom-0 left-0 right-0 z-50">
        {navItems.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t(labelKey)}</span>
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
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<RequireFarmer><Dashboard /></RequireFarmer>} />
        <Route path="/demand" element={<RequireFarmer><DemandIntel /></RequireFarmer>} />
        <Route path="/farm" element={<RequireFarmer><FarmMonitor /></RequireFarmer>} />
        <Route path="/settings" element={<RequireFarmer><SettingsPage /></RequireFarmer>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppLayout>
  )
}
