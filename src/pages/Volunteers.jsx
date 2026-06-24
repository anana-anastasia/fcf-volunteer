import { exportVolunteers } from '../lib/excel'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Download, Search, X } from 'lucide-react'


const GROUP_BADGE = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal'
}
const GROUPS = ['行政', '捐髮', '關懷']
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', group_name: '', phone: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)

  useEffect(() => { fetchVols() }, [])
async function handleExport() {
  await exportVolunteers(volunteers)
}
  async function fetchVols() {
    const { data } = await supabase
      .from('volunteers')
      .select('*')
      .order('group_name')
      .order('name')
    if (data) setVolunteers(data)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.group_name) return alert('請填寫姓名與組別')
    setSubmitting(true)
    const { error } = await supabase.from('volunteers').insert({
      name: form.name.trim(),
      group_name: form.group_name,
      phone: form.phone || null,
      note: form.note || null
    })
    if (error) { alert('新增失敗'); setSubmitting(false); return }
    setForm({ name: '', group_name: '', phone: '', note: '' })
    setShowAdd(false)
    setSubmitting(false)
    fetchVols()
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
    if (!window.confirm('確定刪除此志工？')) return
    const { error } = await supabase.from('volunteers').delete().eq('id', id)
    if (error) { alert('刪除失敗'); return }
    fetchVols()
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

  const displayed = volunteers
    .filter(v => filter === 'all' || v.group_name === filter)
    .filter(v => !search || v.name.includes(search) || (v.phone || '').includes(search))

  const counts = {
    all: volunteers.length,
    行政: volunteers.filter(v => v.group_name === '行政').length,
    捐髮: volunteers.filter(v => v.group_name === '捐髮').length,
    關懷: volunteers.filter(v => v.group_name === '關懷').length,
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">志工資料管理</h1>
        <div className="flex gap-2">
  <button onClick={handleExport} className="btn btn-success">
    <Download className="w-4 h-4" />匯出 Excel
  </button>
  <button onClick={() => setShowAdd(true)} className="btn btn-primary">
    <Plus className="w-4 h-4" />新增志工
  </button>
</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* 統計卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: '全體', key: 'all', color: 'border-t-blue-400' },
            { label: '行政組', key: '行政', color: 'border-t-purple-400' },
            { label: '捐髮組', key: '捐髮', color: 'border-t-amber-400' },
            { label: '關懷組', key: '關懷', color: 'border-t-teal-400' },
          ].map(({ label, key, color }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`card border-t-2 ${color} text-left transition-all hover:shadow-md ${filter === key ? 'shadow-md' : ''}`}>
              <div className="text-xs text-gray-400">{label}</div>
              <div className="text-2xl font-semibold text-gray-800 mt-0.5">{counts[key]}</div>
              <div className="text-xs text-gray-400">人</div>
            </button>
          ))}
        </div>

        {/* 表格 */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input className="input pl-8 text-xs" placeholder="搜尋姓名或電話..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span className="text-xs text-gray-400">共 {displayed.length} 人</span>
            {adminUnlocked && (
              <span className="badge badge-red">管理員模式</span>
            )}
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">姓名</th>
                <th className="table-th">組別</th>
                <th className="table-th">電話</th>
                <th className="table-th">備註</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">尚無志工資料</td></tr>
              ) : displayed.map(v => (
                <tr key={v.id}>
                  <td className="table-td">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                        {v.name[0]}
                      </div>
                      <span className="font-medium">{v.name}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`badge ${GROUP_BADGE[v.group_name] || 'badge-gray'}`}>{v.group_name}</span>
                  </td>
                  <td className="table-td text-gray-500">{v.phone || '—'}</td>
                  <td className="table-td text-gray-400">{v.note || '—'}</td>
                  <td className="table-td">
                    <button onClick={() => askDelete(v.id)}
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

      {/* 新增志工 Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">新增志工</h3>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">姓名 *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">組別 *</label>
                <select className="input" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))}>
                  <option value="">— 請選擇 —</option>
                  {GROUPS.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">電話</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">備註</label>
                <input className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleAdd} disabled={submitting}
                className="btn btn-primary flex-1 justify-center disabled:opacity-60">
                {submitting ? '新增中...' : '確認新增'}
              </button>
              <button onClick={() => setShowAdd(false)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 管理員密碼 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-72">
            <h3 className="font-semibold text-sm mb-1">管理員驗證</h3>
            <p className="text-xs text-gray-400 mb-4">請輸入管理員密碼以執行刪除</p>
            <input type="password" className="input mb-2" placeholder="輸入密碼"
              value={pwInput} onChange={e => setPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
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