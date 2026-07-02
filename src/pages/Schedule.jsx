import { exportSchedule } from '../lib/excel'
import { Download } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, X, Save } from 'lucide-react'

const GROUP_CLASS = {
  行政: 'bg-purple-50 text-purple-700',
  捐髮: 'bg-amber-50 text-amber-700',
  關懷: 'bg-teal-50 text-teal-700'
}
const DAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function Schedule({ toast }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ volunteer_id: '', time_start: '09:00', time_end: '12:00' })
  const [dragShift, setDragShift] = useState(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const startPad = getDay(days[0])

  const fetchShifts = useCallback(async () => {
    const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('shifts')
      .select('*, volunteers(name, group_name)')
      .gte('date', from)
      .lte('date', to)
      .order('time_start')
    if (data) setShifts(data.map(s => ({
      ...s,
      volunteer_name: s.volunteers?.name,
      group_name: s.volunteers?.group_name
    })))
  }, [currentDate])

  useEffect(() => { fetchShifts() }, [fetchShifts])

  useEffect(() => {
    supabase.from('volunteers').select('id, name, group_name, volunteer_no, phone').order('name')
      .then(({ data }) => { if (data) setVolunteers(data) })
  }, [])

  const shiftsForDay = (date) => {
    const key = format(date, 'yyyy-MM-dd')
    return shifts.filter(s => s.date === key)
  }

  async function handleExport() {
    const from = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const to = format(endOfMonth(currentDate), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('shifts')
      .select('*, volunteers(name, group_name)')
      .gte('date', from)
      .lte('date', to)
      .order('date')
    const rows = (data || []).map(s => ({
      ...s,
      volunteer_name: s.volunteers?.name,
      group_name: s.volunteers?.group_name
    }))
    await exportSchedule(year, month, rows)
  }

  const openAdd = (date) => {
    setForm({ volunteer_id: '', volSearch: '', time_start: '09:00', time_end: '12:00' })
    setModal({ mode: 'add', date: format(date, 'yyyy-MM-dd') })
  }

  const openEdit = (shift) => {
    setForm({
      volunteer_id: shift.volunteer_id,
      volSearch: shift.volunteer_name || '',
      time_start: shift.time_start?.slice(0, 5),
      time_end: shift.time_end?.slice(0, 5)
    })
    setModal({ mode: 'edit', shift })
  }

  const handleSave = async () => {
    if (!form.volunteer_id) return alert('請選擇志工')
    if (modal.mode === 'add') {
      const { error } = await supabase.from('shifts').insert({
        date: modal.date,
        volunteer_id: form.volunteer_id,
        time_start: form.time_start,
        time_end: form.time_end
      })
      if (error) return alert('新增失敗')
    } else {
      const { error } = await supabase.from('shifts').update({
        volunteer_id: form.volunteer_id,
        time_start: form.time_start,
        time_end: form.time_end
      }).eq('id', modal.shift.id)
      if (error) return alert('更新失敗')
    }
    setModal(null)
    fetchShifts()
  }

  const handleDelete = async (id) => {
    if (!confirm('確定刪除這筆班次？')) return
    await supabase.from('shifts').delete().eq('id', id)
    setModal(null)
    fetchShifts()
  }

  const handleDrop = async (targetDate, e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-blue-50')
    if (!dragShift) return
    const newDate = format(targetDate, 'yyyy-MM-dd')
    if (dragShift.date === newDate) return
    await supabase.from('shifts').update({ date: newDate }).eq('id', dragShift.id)
    setDragShift(null)
    fetchShifts()
  }

  const monthNames = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-gray-800 shrink-0">排班管理</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <p className="text-xs text-gray-400 hidden md:block">點擊班次可編輯，拖曳可移動日期</p>
          <button onClick={handleExport} className="btn btn-success text-xs">
            <Download className="w-4 h-4" />匯出 Excel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="card">
          {/* 月份切換 */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn btn-ghost p-1.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-sm w-28 text-center">
                {year} 年 {monthNames[month]}
              </span>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn btn-ghost p-1.5">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="btn btn-secondary text-xs">本月</button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-200 inline-block" />行政</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-200 inline-block" />捐髮</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-200 inline-block" />關懷</span>
            </div>
          </div>

          {/* 月曆：手機可橫向滑動 */}
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                {DAYS.map(d => (
                  <div key={d} className="bg-gray-50 text-center text-xs text-gray-400 font-medium py-2">{d}</div>
                ))}
                {Array(startPad).fill(null).map((_, i) => (
                  <div key={`pad-${i}`} className="bg-gray-50 min-h-24" />
                ))}
                {days.map(day => {
                  const dayShifts = shiftsForDay(day)
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  return (
                    <div key={day.toString()}
                      className={`bg-white min-h-24 p-1.5 transition-colors ${isToday ? 'bg-blue-50/50' : ''}`}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('bg-blue-50') }}
                      onDragLeave={e => e.currentTarget.classList.remove('bg-blue-50')}
                      onDrop={e => handleDrop(day, e)}
                    >
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-blue-500 text-white' : 'text-gray-600'}`}>
                        {day.getDate()}
                      </div>
                      {dayShifts.map(s => (
                        <div key={s.id}
                          draggable
                          onDragStart={() => setDragShift(s)}
                          onDragEnd={() => setDragShift(null)}
                          onClick={() => openEdit(s)}
                          className={`text-[11px] px-1.5 py-0.5 rounded mb-0.5 cursor-pointer hover:opacity-80 ${GROUP_CLASS[s.group_name] || 'bg-gray-50 text-gray-600'}`}
                        >
                          <span className="font-medium">{s.time_start?.slice(0, 5)}–{s.time_end?.slice(0, 5)}</span>
                          <span className="ml-1">{s.volunteer_name}</span>
                        </div>
                      ))}
                      <button onClick={() => openAdd(day)}
                        className="w-full text-[10px] text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded py-0.5 mt-0.5 transition-colors">
                        + 新增
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm">{modal.mode === 'add' ? '新增班次' : '編輯班次'}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{modal.date || modal.shift?.date}</p>
              </div>
              <button onClick={() => setModal(null)} className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
  <label className="text-xs font-medium text-gray-600 block mb-1">志工</label>
  <input className="input mb-1" placeholder="搜尋姓名、編號或電話..."
    value={form.volSearch || ''}
    onChange={e => setForm(f => ({ ...f, volSearch: e.target.value, volunteer_id: '' }))} />
  {form.volSearch && (
    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
      {volunteers
        .filter(v =>
          v.name.includes(form.volSearch) ||
          (v.volunteer_no || '').includes(form.volSearch) ||
          (form.volSearch.replace(/\D/g, '') && (v.volunteer_no || '').replace(/\D/g, '').includes(form.volSearch.replace(/\D/g, ''))) ||
          (v.phone || '').includes(form.volSearch)
        )
        .map(v => (
          <button key={v.id} type="button"
            onClick={() => setForm(f => ({ ...f, volunteer_id: v.id, volSearch: v.name }))}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2
              ${form.volunteer_id === v.id ? 'bg-blue-50 text-blue-600' : ''}`}>
            <span className="text-gray-400 text-xs w-12">{v.volunteer_no || '—'}</span>
            <span>{v.name}</span>
            <span className="text-gray-400 text-xs ml-auto">{v.group_name}</span>
          </button>
        ))}
    </div>
  )}
  {form.volunteer_id && !form.volSearch?.includes('搜') && (
    <p className="text-xs text-green-600 mt-1">
      ✓ 已選擇：{volunteers.find(v => v.id === form.volunteer_id)?.name}
    </p>
  )}
</div>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">開始時間</label>
                  <input type="time" className="input" value={form.time_start}
                    onChange={e => setForm(f => ({ ...f, time_start: e.target.value }))} />
                </div>
                <span className="text-gray-400 mt-5">–</span>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">結束時間</label>
                  <input type="time" className="input" value={form.time_end}
                    onChange={e => setForm(f => ({ ...f, time_end: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} className="btn btn-primary flex-1 justify-center">
                <Save className="w-3.5 h-3.5" />儲存
              </button>
              {modal.mode === 'edit' && (
                <button onClick={() => handleDelete(modal.shift.id)} className="btn btn-danger">
                  <X className="w-3.5 h-3.5" />刪除
                </button>
              )}
              <button onClick={() => setModal(null)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}