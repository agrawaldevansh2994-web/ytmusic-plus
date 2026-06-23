import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Shuffle from './pages/Shuffle'
import Playlists from './pages/Playlists'

export default function App() {
  return (
    <div className="pt-safe pb-nav-safe"> {/* safe-area top + room for bottom nav */}
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shuffle" element={<Shuffle />} />
        <Route path="/playlists" element={<Playlists />} />
      </Routes>

      {/* ── Bottom navigation ───────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800/70 bg-zinc-950/90 backdrop-blur-md pb-safe">
        <div className="flex justify-around items-center h-16">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${
              isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                Stats
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-2" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/shuffle"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${
              isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4l4 4m0 0l4-4m-4 4v12M20 20l-4-4m0 0l-4 4m4-4V4" />
              </svg>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                Shuffle
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-2" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/playlists"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-6 py-2 rounded-xl transition-colors ${
              isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2.5 : 1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 17V5l12-2v12M9 17a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className={`text-[10px] font-semibold ${isActive ? 'text-white' : 'text-zinc-500'}`}>
                Playlists
              </span>
              {isActive && <span className="w-1 h-1 rounded-full bg-red-500 absolute bottom-2" />}
            </>
          )}
        </NavLink>
        </div>
      </nav>
    </div>
  )
}
