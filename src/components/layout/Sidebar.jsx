import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, QrCode,
  GraduationCap, FileText, Users, X
} from 'lucide-react'

const navItems = [
  { to: '/', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/schedule', label: '排班管理', icon: Calendar },
  { to: '/checkin', label: '簽到系統', icon: QrCode },
  { to: '/courses', label: '在職教育', icon: GraduationCap },
  { to: '/records', label: '服務紀錄', icon: FileText },
  { to: '/volunteers', label: '志工資料管理', icon: Users },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-screen">
      <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between">
        <img src="/logo.png" alt="台灣癌症基金會" className="h-10 w-auto" />
        {/* 手機關閉按鈕 */}
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 md:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 py-2">
        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          主選單
        </div>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-4 py-2 text-sm transition-all border-l-2 ${
                isActive
                  ? 'text-blue-600 bg-blue-50 border-blue-500 font-medium'
                  : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-50'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}