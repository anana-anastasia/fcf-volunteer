import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { exportServiceRecords } from '../lib/excel'
import { Download } from 'lucide-react'

const GROUP_BADGE = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal'
}

function roundToHalf(date) {
  const m = date.getMinutes()
  if (m <= 15) {
    date.setMinutes(0, 0, 0)
  } else if (m <= 44) {
    date.setMinutes(30, 0, 0)
  } else {
    date.setHours(date.getHours() + 1, 0, 0, 0)
  }
  return date
}

export default function Records() {
  const [records, setRecords] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [filter, setFilter] = useState({ vol: 'all', group: 'all', year: 'all', month: 'all' })
  const [volSearch, setVolSearch] = useState('')
  const [showVolList, setShowVolList] = useState(false)
  const [selectedVolName, setSelectedVolName] = useState('')

  useEffect(() => {
    supabase.from('volunteers').select('id, name, group_name, volunteer_no, phone').order('name')
      .then(({ data }) => { if (data) setVolunteers(data) })
  }, [])

  useEffect(() => { fetchRecords() }, [filter])

  async function handleExport() {
    await exportServiceRecords(records)
  }

  async function fetchRecords() {
    let q = supabase.from('checkins')
      .select('*, volunteers(name, group_name), shifts(date, time_start, time_end)')
      .order('checked_in_at', { ascending: false })
    if (filter.vol !== 'all') q = q.eq('volunteer_id', filter.vol)
    const { data } = await q
    if (!data) return
    let rows = data.filter(c => c.shifts).map(c => {
      const timeStart = c.shifts?.time_start
      const timeEnd = c.shifts?.time_end
      let hours = 0
      let displayStart = timeStart?.slice(0, 5)
      let displayEnd = timeEnd?.slice(0, 5)
      if (c.checked_in_at && c.checked_out_at) {
        const start = roundToHalf(new Date(c.checked_in_at))
        const end = roundToHalf(new Date(c.checked_out_at))
        hours = Math.max(0, (end - start) / 3600000)
        displayStart = start.toTimeString().slice(0, 5)
        displayEnd = end.toTimeString().slice(0, 5)
      }
      return {
        id: c.id, date: c.shifts?.date,
        volunteer_name: c.volunteers?.name,
        group_name: c.volunteers?.group_name,
        time_start: displayStart,
        time_end: displayEnd,
        hours, checked_in_at: c.checked_in_at, checked_out_at: c.checked_out_at,
      }
    })
    if (filter.group !== 'all') rows = rows.filter(r => r.group_name === filter.group)
    if (filter.year !== 'all') rows = rows.filter(r => r.date?.startsWith(filter.year))
    if (filter.month !== 'all') rows = rows.filter(r => r.date?.slice(5, 7) === filter.month.padStart(2, '0'))
    setRecords(rows)
  }

  const totalHours = records.reduce((a, r) => a + r.hours, 0)
  const uniqueVols = new Set(records.map(r => r.volunteer_name)).size

  const filteredVols = volunteers.filter(v =>
    v.name.includes(volSearch) ||
    (v.volunteer_no || '').includes(volSearch) ||
    (v.volunteer_no || '').replace(/\D/g, '').includes(volSearch.replace(/\D/g, '')) ||
    (v.phone || '').includes(volSearch)
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-gray-800 shrink-0">服務紀錄</h1>
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400 hidden md:block">根據簽到紀錄自動計算</p>
          <button onClick={handleExport} className="btn btn-success text-xs">
            <Download className="w-4 h-4" />匯出 Excel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="card mb-4">
          <div className="flex gap-2 flex-wrap items-start">
            {/* 志工搜尋 */}
            <div className="relative w-full sm:w-48">
              <input className="input" placeholder="搜尋志工姓名、編號或電話..."
                value={volSearch}
                onChange={e => {
                  setVolSearch(e.target.value)
                  setShowVolList(true)
                  if (!e.target.value) {
                    setFilter(f => ({ ...f, vol: 'all' }))
                    setSelectedVolName('')
                  }
                }}
                onFocus={() => setShowVolList(true)}
              />
              {volSearch && showVolList && (
                <div className="absolute z-10 w-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilter(f => ({ ...f, vol: 'all' }))
                      setVolSearch('')
                      setSelectedVolName('')
                      setShowVolList(false)
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">
                    所有志工
                  </button>
                  {filteredVols.map(v => (
                    <button key={v.id}
                      onClick={() => {
                        setFilter(f => ({ ...f, vol: v.id }))
                        setVolSearch(v.name)
                        setSelectedVolName(v.name)
                        setShowVolList(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2
                        ${filter.vol === v.id ? 'bg-blue-50 text-blue-600' : ''}`}>
                      <span className="text-gray-400 text-xs w-12">{v.volunteer_no || '—'}</span>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {filter.vol !== 'all' && (
                <p className="text-xs text-green-600 mt-1">✓ 已選擇：{selectedVolName}</p>
              )}
            </div>

            <select className="input w-full sm:w-28" value={filter.group}
              onChange={e => setFilter(f => ({ ...f, group: e.target.value }))}>
              <option value="all">所有組別</option>
              <option value="行政">行政組</option>
              <option value="捐髮">捐髮組</option>
              <option value="關懷">關懷組</option>
            </select>
            <select className="input w-full sm:w-24" value={filter.year}
              onChange={e => setFilter(f => ({ ...f, year: e.target.value }))}>
              <option value="all">所有年份</option>
              <option value="2026">2026 年</option>
              <option value="2025">2025 年</option>
              <option value="2024">2024 年</option>
            </select>
            <select className="input w-full sm:w-24" value={filter.month}
              onChange={e => setFilter(f => ({ ...f, month: e.target.value }))}>
              <option value="all">所有月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>{m} 月</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[['服務時數', totalHours, '小時'], ['出勤次數', records.length, '次'], ['志工人數', uniqueVols, '人']].map(([label, val, unit]) => (
            <div key={label} className="card text-center p-3 md:p-4">
              <div className="text-xl md:text-2xl font-semibold text-blue-600">{val}</div>
              <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{label}（{unit}）</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="font-medium text-sm text-gray-700 mb-3">服務紀錄明細</div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '400px' }}>
              <thead>
                <tr>
                  <th className="table-th">日期</th>
                  <th className="table-th">志工</th>
                  <th className="table-th">組別</th>
                  <th className="table-th">時段</th>
                  <th className="table-th">時數</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">無符合條件的紀錄</td></tr>
                ) : records.map(r => (
                  <tr key={r.id}>
                    <td className="table-td text-gray-500 whitespace-nowrap">{r.date}</td>
                    <td className="table-td font-medium whitespace-nowrap">{r.volunteer_name}</td>
                    <td className="table-td">
                      <span className={`badge ${GROUP_BADGE[r.group_name] || 'badge-gray'}`}>{r.group_name}</span>
                    </td>
                    <td className="table-td text-gray-500 whitespace-nowrap">{r.time_start}–{r.time_end}</td>
                    <td className="table-td">{r.hours} 小時</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}