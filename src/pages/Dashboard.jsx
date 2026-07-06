import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const GROUP_BADGE = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal',
  機動: 'badge-blue'
}

export default function Dashboard() {
  const [todayShifts, setTodayShifts] = useState([])
  const navigate = useNavigate()
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    fetchTodayShifts()
  }, [])

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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">總覽</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 hidden sm:block">{format(new Date(), 'yyyy 年 MM 月 dd 日')}</span>
          <button onClick={() => navigate('/records')} className="btn btn-secondary text-xs">
            服務紀錄 →
          </button>
          <button onClick={() => navigate('/checkin')} className="btn btn-primary text-xs">
            前往簽到 →
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* 今日出勤卡片 */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="card border-t-2 border-t-blue-400">
            <div className="text-xs text-gray-400 mb-1">今日出勤</div>
            <div className="text-2xl font-semibold text-gray-800">
              {todayShifts.filter(s => s.checked).length} / {todayShifts.length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">已到 / 排班</div>
          </div>
          <div className="card border-t-2 border-t-green-400">
            <div className="text-xs text-gray-400 mb-1">今日日期</div>
            <div className="text-lg font-semibold text-gray-800">{format(new Date(), 'MM / dd')}</div>
            <div className="text-xs text-gray-400 mt-0.5">{format(new Date(), 'yyyy')} 年</div>
          </div>
        </div>

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
      </div>
    </div>
  )
}