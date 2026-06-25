import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, QrCode, NotebookText,
  GraduationCap, FileText, Users, Heart, X
} from 'lucide-react'

const navItems = [
  { to: '/', label: '總覽', icon: LayoutDashboard, end: true },
  { to: '/schedule', label: '排班管理', icon: Calendar },
  { to: '/checkin', label: '簽到系統', icon: QrCode },
  { to: '/hairlog', label: '捐髮工作日誌', icon: NotebookText },
  { to: '/courses', label: '在職教育', icon: GraduationCap },
  { to: '/records', label: '服務紀錄', icon: FileText },
  { to: '/volunteers', label: '志工資料管理', icon: Users },
]

export default function Sidebar({ onClose }) {
  return (
    <aside className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-screen">
      <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-gray-500 tracking-wide">台灣癌症基金會</span>
          </div>
          <div className="text-sm font-medium text-gray-800">志工管理系統</div>
        </div>
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