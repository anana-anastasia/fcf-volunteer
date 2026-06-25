import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const GROUP_BADGE = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal'
}

export default function Dashboard() {
  const [stats, setStats] = useState({ admin: 0, hair: 0, care: 0 })
  const [todayShifts, setTodayShifts] = useState([])
  const [checkins, setCheckins] = useState([])
  const [recentLogs, setRecentLogs] = useState([])
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    fetchStats()
    fetchTodayShifts()
    fetchRecentLogs()
  }, [])

  async function fetchStats() {
    const { data } = await supabase.from('volunteers').select('group_name')
    if (data) setStats({
      admin: data.filter(v => v.group_name === '行政').length,
      hair: data.filter(v => v.group_name === '捐髮').length,
      care: data.filter(v => v.group_name === '關懷').length,
    })
  }

  async function fetchTodayShifts() {
    const { data: shifts } = await supabase
      .from('shifts')
      .select('*, volunteers(name, group_name)')
      .eq('date', today)
      .order('time_start')

    const { data: ci } = await supabase
      .from('checkins')
      .select('shift_id')
      .gte('checked_in_at', today + 'T00:00:00')

    const checkedIds = new Set((ci || []).map(c => c.shift_id))

    if (shifts) setTodayShifts(shifts.map(s => ({
      ...s,
      volunteer_name: s.volunteers?.name,
      group_name: s.volunteers?.group_name,
      checked: checkedIds.has(s.id)
    })))
  }

  async function fetchRecentLogs() {
    const { data } = await supabase
      .from('hair_logs')
      .select('*, volunteers(name)')
      .order('date', { ascending: false })
      .limit(5)
    if (data) setRecentLogs(data.map(l => ({ ...l, volunteer_name: l.volunteers?.name })))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">總覽</h1>
        <span className="text-xs text-gray-400">{format(new Date(), 'yyyy 年 MM 月 dd 日')}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* 統計卡片：手機2欄，桌機4欄 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: '行政組', value: stats.admin, color: 'border-t-purple-400', sub: '人' },
            { label: '捐髮組', value: stats.hair, color: 'border-t-amber-400', sub: '人' },
            { label: '關懷組', value: stats.care, color: 'border-t-teal-400', sub: '人' },
            { label: '今日出勤', value: todayShifts.filter(s => s.checked).length + ' / ' + todayShifts.length, color: 'border-t-blue-400', sub: '已到 / 排班' },
          ].map(s => (
            <div key={s.label} className={`card border-t-2 ${s.color}`}>
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{s.label}</div>
              <div className="text-2xl font-semibold text-gray-800">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* 下方區塊：手機單欄，桌機雙欄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 今日班表 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-gray-700">今日班表</span>
              <button onClick={() => navigate('/schedule')} className="btn btn-ghost text-xs">查看排班 →</button>
            </div>
            {todayShifts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">今日尚無排班</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="table-th">志工</th>
                    <th className="table-th">組別</th>
                    <th className="table-th">時段</th>
                    <th className="table-th">狀態</th>
                  </tr></thead>
                  <tbody>
                    {todayShifts.map(s => (
                      <tr key={s.id}>
                        <td className="table-td font-medium">{s.volunteer_name}</td>
                        <td className="table-td">
                          <span className={`badge ${GROUP_BADGE[s.group_name] || 'badge-gray'}`}>{s.group_name}</span>
                        </td>
                        <td className="table-td text-gray-500 whitespace-nowrap">{s.time_start?.slice(0,5)}–{s.time_end?.slice(0,5)}</td>
                        <td className="table-td">
                          <span className={`badge ${s.checked ? 'badge-green' : 'badge-amber'}`}>
                            {s.checked ? '已到' : '待到'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 近期捐髮日誌 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-gray-700">近期每日日誌</span>
              <button onClick={() => navigate('/hairlog')} className="btn btn-ghost text-xs">查看日誌 →</button>
            </div>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">尚無日誌紀錄</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr>
                    <th className="table-th">日期</th>
                    <th className="table-th">志工</th>
                    <th className="table-th">拆信</th>
                    <th className="table-th">建檔</th>
                    <th className="table-th">捐髮</th>
                  </tr></thead>
                  <tbody>
                    {recentLogs.map(l => (
                      <tr key={l.id}>
                        <td className="table-td text-gray-500 whitespace-nowrap">{l.date}</td>
                        <td className="table-td font-medium">{l.volunteer_name}</td>
                        <td className="table-td">{l.letters || 0}</td>
                        <td className="table-td">{l.excel_count || 0}</td>
                        <td className="table-td">{l.walkin_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}