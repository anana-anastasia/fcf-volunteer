import { exportHairLogs } from '../lib/excel'
import { Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { Trash2, X } from 'lucide-react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const FIELDS = [
  { key: 'letters', label: '拆信（含分髮）封數', type: 'number' },
  { key: 'excel_count', label: 'Excel 建檔筆數', type: 'number' },
  { key: 'print_range', label: '列印編號', type: 'text', placeholder: 'A001–A050' },
  { key: 'thank_cards', label: '感謝卡（張）', type: 'number' },
  { key: 'mail_count', label: '郵寄（封）30封一綑', type: 'number' },
  { key: 'walkin_count', label: '現場捐髮（人數）', type: 'number' },
  { key: 'phone_calls', label: '接聽專線（次）', type: 'number' },
  { key: 'note', label: '備註', type: 'text', placeholder: '選填' },
]

export default function HairLog() {
  const [logs, setLogs] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [form, setForm] = useState({
    volunteer_id: '', date: format(new Date(), 'yyyy-MM-dd'),
    letters: '', excel_count: '', print_range: '',
    thank_cards: '', mail_count: '', walkin_count: '',
    phone_calls: '', note: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => { fetchLogs(); fetchVols() }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('hair_logs')
      .select('*, volunteers(name)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (data) setLogs(data.map(l => ({ ...l, volunteer_name: l.volunteers?.name })))
  }

  async function handleExport() {
    await exportHairLogs(logs)
  }

  async function fetchVols() {
    const { data } = await supabase.from('volunteers').select('id, name').order('name')
    if (data) setVolunteers(data)
  }

  async function handleSubmit() {
    if (!form.volunteer_id || !form.date) return alert('請選擇志工與日期')
    setSubmitting(true)
    const { error } = await supabase.from('hair_logs').insert({
      volunteer_id: form.volunteer_id,
      date: form.date,
      letters: parseInt(form.letters) || 0,
      excel_count: parseInt(form.excel_count) || 0,
      print_range: form.print_range || null,
      thank_cards: parseInt(form.thank_cards) || 0,
      mail_count: parseInt(form.mail_count) || 0,
      walkin_count: parseInt(form.walkin_count) || 0,
      phone_calls: parseInt(form.phone_calls) || 0,
      note: form.note || null,
    })
    if (error) { alert('送出失敗'); setSubmitting(false); return }
    setForm({
      volunteer_id: '', date: format(new Date(), 'yyyy-MM-dd'),
      letters: '', excel_count: '', print_range: '',
      thank_cards: '', mail_count: '', walkin_count: '',
      phone_calls: '', note: ''
    })
    setSubmitting(false)
    fetchLogs()
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
    if (!confirm('確定刪除此筆日誌？')) return
    await supabase.from('hair_logs').delete().eq('id', id)
    fetchLogs()
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

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">每日工作日誌</h1>
        <div className="flex items-center gap-2">
          {adminUnlocked && <span className="badge badge-red">管理員模式</span>}
          <button onClick={handleExport} className="btn btn-success text-xs">
            <Download className="w-4 h-4" />匯出 Excel
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* 手機單欄，桌機雙欄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 填寫表單 */}
          <div className="card">
            <div className="font-medium text-sm text-gray-700 mb-4">填寫工作日誌</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">志工姓名</label>
                <select className="input" value={form.volunteer_id}
                  onChange={e => setForm(f => ({ ...f, volunteer_id: e.target.value }))}>
                  <option value="">— 請選擇 —</option>
                  {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">日期</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {FIELDS.map(f => (
                  <div key={f.key} className={f.key === 'note' ? 'col-span-2' : ''}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                    <input type={f.type} className="input"
                      placeholder={f.placeholder || '0'}
                      min={f.type === 'number' ? 0 : undefined}
                      value={form[f.key]}
                      onChange={e => setForm(fr => ({ ...fr, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                className="btn btn-primary w-full justify-center disabled:opacity-60">
                {submitting ? '送出中...' : '✓ 送出日誌'}
              </button>
            </div>
          </div>

          {/* 日誌紀錄 */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-sm text-gray-700">日誌紀錄</span>
              <button onClick={() => {
                if (adminUnlocked) {
                  setAdminUnlocked(false)
                } else {
                  setShowAdminModal(true)
                }
              }} className={`btn text-xs ${adminUnlocked ? 'btn-danger' : 'btn-secondary'}`}>
                {adminUnlocked ? '登出管理員' : '🔒 管理員登入'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: '580px' }}>
                <thead>
                  <tr>
                    {['日期', '志工', '列印編號', '拆信', '建檔', '感謝卡', '郵寄', '捐髮', '專線', '備註', ''].map(h => (
                    <th key={h} className="table-th">{h}</th>
                   ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={10} className="table-td text-center text-gray-400 py-6">尚無日誌紀錄</td></tr>
                  ) : logs.map(l => (
                    <tr key={l.id}>
                      <td className="table-td text-gray-500 whitespace-nowrap">{l.date}</td>
                      <td className="table-td font-medium whitespace-nowrap">{l.volunteer_name}</td>
                      <td className="table-td font-medium text-blue-600 whitespace-nowrap">{l.print_range || '—'}</td>
                      <td className="table-td">{l.letters || 0}</td>
                      <td className="table-td">{l.excel_count || 0}</td>
                      <td className="table-td">{l.thank_cards || 0}</td>
                      <td className="table-td">{l.mail_count || 0}</td>
                      <td className="table-td">{l.walkin_count || 0}</td>
                      <td className="table-td">{l.phone_calls || 0}</td>
                      <td className="table-td text-gray-400 max-w-[80px] truncate">{l.note || '—'}</td>
                      <td className="table-td">
                        <button onClick={() => askDelete(l.id)}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

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