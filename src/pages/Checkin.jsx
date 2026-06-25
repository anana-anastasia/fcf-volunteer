import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { CheckCircle2, Search, LogOut, Trash2, X } from 'lucide-react'

const GROUP_BADGE = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal'
}

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function Checkin() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [todayShifts, setTodayShifts] = useState([])
  const [checkins, setCheckins] = useState([])
  const [search, setSearch] = useState('')
  const [manualName, setManualName] = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: shifts }, { data: ci }] = await Promise.all([
      supabase.from('shifts')
        .select('*, volunteers(name, group_name)')
        .eq('date', today)
        .order('time_start'),
      supabase.from('checkins')
        .select('*, volunteers(name, group_name)')
        .gte('checked_in_at', today + 'T00:00:00')
        .order('checked_in_at')
    ])
    if (shifts) setTodayShifts(shifts.map(s => ({
      ...s,
      volunteer_name: s.volunteers?.name,
      group_name: s.volunteers?.group_name
    })))
    if (ci) setCheckins(ci.map(c => ({
      ...c,
      volunteer_name: c.volunteers?.name,
      group_name: c.volunteers?.group_name
    })))
  }

  const getCheckin = (shiftId) => checkins.find(c => c.shift_id === shiftId)

  const handleCheckin = async (shift) => {
    const existing = getCheckin(shift.id)
    if (existing) return
    const { error } = await supabase.from('checkins').insert({
      shift_id: shift.id,
      volunteer_id: shift.volunteer_id
    })
    if (error) return alert('簽到失敗')
    fetchData()
  }

  const handleCheckout = async (shift) => {
    const existing = getCheckin(shift.id)
    if (!existing) return
    if (existing.checked_out_at) return alert('已經簽退了')
    const { error } = await supabase.from('checkins')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) return alert('簽退失敗')
    fetchData()
  }

  const handleManualCheckin = async () => {
    if (!manualName.trim()) return
    const { data: vol } = await supabase
      .from('volunteers')
      .select('id, name, group_name')
      .ilike('name', manualName.trim())
      .single()
    if (!vol) return alert('找不到此志工，請確認姓名')
    const { error } = await supabase.from('checkins').insert({
      volunteer_id: vol.id
    })
    if (error) return alert('簽到失敗')
    setManualName('')
    fetchData()
  }

  function askDelete(id) {
    if (adminUnlocked) {
      confirmDelete(id)
    } else {
      setPendingDeleteId(id)
      setShowAdminModal(true)
    }
  }

  async function confirmDelete(id) {
    if (!confirm('確定刪除此筆簽到紀錄？')) return
    await supabase.from('checkins').delete().eq('id', id)
    fetchData()
  }

  function handleAdminLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true)
      setShowAdminModal(false)
      setPwInput('')
      setPwError('')
      if (pendingDeleteId) {
        confirmDelete(pendingDeleteId)
        setPendingDeleteId(null)
      }
    } else {
      setPwError('密碼錯誤，請重試')
    }
  }

  const filtered = todayShifts.filter(s =>
    !search || s.volunteer_name?.includes(search)
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">簽到系統</h1>
        <span className="text-xs text-gray-400">今日：{today}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 左欄 */}
          <div className="space-y-4">
            <div className="card">
              <div className="font-medium text-sm text-gray-700 mb-3">今日班表 — 點擊簽到／簽退</div>
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input className="input pl-8 text-xs" placeholder="搜尋志工..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">今日無班表</p>
              ) : (
                <div className="space-y-1.5">
                  {filtered.map(s => {
                    const ci = getCheckin(s.id)
                    const checkedIn = !!ci
                    const checkedOut = !!ci?.checked_out_at
                    return (
                      <div key={s.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all
                          ${checkedOut ? 'bg-gray-50 border-gray-200'
                          : checkedIn ? 'bg-green-50 border-green-200'
                          : 'border-gray-100'}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                          {s.volunteer_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{s.volunteer_name}</div>
                          <div className="text-xs text-gray-400">
                            {s.time_start?.slice(0, 5)}–{s.time_end?.slice(0, 5)}
                          </div>
                        </div>
                        <span className={`badge ${GROUP_BADGE[s.group_name] || 'badge-gray'} hidden sm:inline-flex`}>
                          {s.group_name}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          {!checkedIn ? (
                            <button onClick={() => handleCheckin(s)}
                              className="btn btn-primary text-xs py-1 px-2">
                              簽到
                            </button>
                          ) : !checkedOut ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <button onClick={() => handleCheckout(s)}
                                className="btn btn-secondary text-xs py-1 px-2">
                                <LogOut className="w-3 h-3" />簽退
                              </button>
                            </>
                          ) : (
                            <span className="badge badge-gray text-xs">已簽退</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <div className="font-medium text-sm text-gray-700 mb-3">手動簽到</div>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="輸入志工姓名..."
                  value={manualName} onChange={e => setManualName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleManualCheckin()} />
                <button onClick={handleManualCheckin} className="btn btn-primary">簽到</button>
              </div>
            </div>
          </div>

          {/* 右欄：今日簽到紀錄 */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-gray-700">今日簽到紀錄</span>
              <div className="flex items-center gap-2">
                {adminUnlocked && <span className="badge badge-red">管理員模式</span>}
                <button onClick={() => {
                  if (adminUnlocked) setAdminUnlocked(false)
                  else setShowAdminModal(true)
                }} className={`btn text-xs ${adminUnlocked ? 'btn-danger' : 'btn-secondary'}`}>
                  {adminUnlocked ? '登出' : '🔒 管理員'}
                </button>
                <span className="badge badge-blue">已到 {checkins.length} 人</span>
              </div>
            </div>
            {checkins.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">今日尚無簽到紀錄</p>
            ) : (
              <div className="space-y-1.5">
                {checkins.map(c => (
                  <div key={c.id} className="flex items-center gap-2 py-2 border-b border-gray-50">
                    <div className="text-xs text-gray-400 w-20 flex-shrink-0">
                      <div>到 {c.checked_in_at ? format(new Date(c.checked_in_at), 'HH:mm') : '—'}</div>
                      {c.checked_out_at && (
                        <div>退 {format(new Date(c.checked_out_at), 'HH:mm')}</div>
                      )}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 flex-shrink-0">
                      {c.volunteer_name?.[0]}
                    </div>
                    <span className="flex-1 text-sm truncate">{c.volunteer_name}</span>
                    <span className={`badge ${GROUP_BADGE[c.group_name] || 'badge-gray'} text-[10px] hidden sm:inline-flex`}>
                      {c.group_name}
                    </span>
                    <span className={`badge ${c.checked_out_at ? 'badge-gray' : 'badge-green'} text-[10px] flex-shrink-0`}>
                      {c.checked_out_at ? '已簽退' : '服務中'}
                    </span>
                    {adminUnlocked && (
                      <button onClick={() => askDelete(c.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 管理員 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">管理員驗證</h3>
              <button onClick={() => { setShowAdminModal(false); setPwInput(''); setPwError('') }}
                className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">輸入管理員密碼以啟用刪除功能</p>
            <input type="password" className="input mb-2" placeholder="輸入密碼"
              value={pwInput} onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} autoFocus />
            {pwError && <p className="text-xs text-red-500 mb-2">{pwError}</p>}
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdminLogin} className="btn btn-primary flex-1 justify-center">確認</button>
              <button onClick={() => { setShowAdminModal(false); setPwInput(''); setPwError('') }}
                className="btn btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}