import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { BookOpen, CalendarCheck, List, Settings } from 'lucide-react'
import Today from './pages/Today'
import Problems from './pages/Problems'
import ProblemDetail from './pages/ProblemDetail'
import CreateProblem from './pages/CreateProblem'
import Knowledge from './pages/Knowledge'
import KnowledgeDetail from './pages/KnowledgeDetail'
import SettingsPage from './pages/Settings'

const NAV_ITEMS = [
  { to: '/today', label: 'Today', icon: CalendarCheck },
  { to: '/problems', label: 'Problems', icon: List },
  { to: '/knowledge', label: 'Knowledge', icon: BookOpen },
  { to: '/settings', label: 'Settings', icon: Settings }
]

function Sidebar(): React.JSX.Element {
  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-4 text-lg font-semibold tracking-wide">
        CodeLearn
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-900 font-medium text-white'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto px-5 py-3 text-xs text-zinc-400">v0.1 · M4</div>
    </aside>
  )
}

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="flex h-full">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="/today" element={<Today />} />
            <Route path="/problems" element={<Problems />} />
            <Route path="/problems/new" element={<CreateProblem />} />
            <Route path="/problems/:id" element={<ProblemDetail />} />
            <Route path="/knowledge" element={<Knowledge />} />
            <Route path="/knowledge/:id" element={<KnowledgeDetail />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
