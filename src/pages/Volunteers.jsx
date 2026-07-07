import { exportVolunteers } from '../lib/excel'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Download, Search, X, Pencil } from 'lucide-react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

const GROUP_COLORS = {
  行政: 'badge-purple',
  捐髮: 'badge-amber',
  關懷: 'badge-teal',
  機動: 'badge-blue',
}

const IDENTITIES = ['癌友', '家屬', '一般民眾', '抗癌鬥士']

const emptyForm = {
  name: '', volunteer_no: '', group_names: [],
  identities: [], skill_names: [], phone: '', note: ''
}

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([])
  const [groups, setGroups] = useState([])
  const [skills, setSkills] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newSkillName, setNewSkillName] = useState('')
  const [showAddGroup, setShowAddGroup] = useState(false)

  useEffect(() => { fetchVols(); fetchGroups(); fetchSkills() }, [])

  async function fetchVols() {
    const { data } = await supabase.from('volunteers').select('*')
    if (data) {
      const sorted = data.sort((a, b) => {
        const na = parseInt((a.volunteer_no || '').replace(/\D/g, '')) || 99999
        const nb = parseInt((b.volunteer_no || '').replace(/\D/g, '')) || 99999
        return na - nb
      })
      setVolunteers(sorted)
    }
  }

  async function fetchGroups() {
    const { data } = await supabase.from('groups').select('*').order('name')
    if (data) setGroups(data)
  }

  async function fetchSkills() {
    const { data } = await supabase.from('skills').select('*').order('name')
    if (data) setSkills(data)
  }

  async function getNextVolNo() {
    const { data } = await supabase.from('volunteers').select('volunteer_no')
    const nums = (data || [])
      .map(v => parseInt((v.volunteer_no || '').replace(/\D/g, '')))
      .filter(n => !isNaN(n))
    const max = nums.length > 0 ? Math.max(...nums) : 0
    return 'V' + String(max + 1).padStart(3, '0')
  }

  async function handleAdd() {
    if (!form.name.trim() || form.group_names.length === 0) return alert('請填寫姓名並選擇至少一個組別')
    setSubmitting(true)
    const { error } = await supabase.from('volunteers').insert({
      name: form.name.trim(),
      volunteer_no: form.volunteer_no || null,
      group_name: null,
      group_names: form.group_names,
      identities: form.identities,
      skill_names: form.skill_names,
      phone: form.phone || null,
      note: form.note || null,
    })
    if (error) { alert('新增失敗'); setSubmitting(false); return }
    setForm(emptyForm)
    setShowAdd(false)
    setSubmitting(false)
    fetchVols()
  }

  function openEdit(v) {
    if (!adminUnlocked) { setShowAdminModal(true); return }
    setEditTarget(v)
    setEditForm({
      name: v.name,
      volunteer_no: v.volunteer_no || '',
      group_names: v.group_names?.length ? v.group_names : [v.group_name].filter(Boolean),
      identities: v.identities || [],
      skill_names: v.skill_names || [],
      phone: v.phone || '',
      note: v.note || '',
    })
    setShowEdit(true)
  }

  async function handleEdit() {
    if (!editForm.name.trim() || editForm.group_names.length === 0) return alert('請填寫姓名並選擇至少一個組別')
    setSubmitting(true)
    const { error } = await supabase.from('volunteers').update({
      name: editForm.name.trim(),
      volunteer_no: editForm.volunteer_no || null,
      group_name: null,
      group_names: editForm.group_names,
      identities: editForm.identities,
      skill_names: editForm.skill_names,
      phone: editForm.phone || null,
      note: editForm.note || null,
    }).eq('id', editTarget.id)
    if (error) { alert('更新失敗'); setSubmitting(false); return }
    setShowEdit(false)
    setEditTarget(null)
    setSubmitting(false)
    fetchVols()
  }

  function toggleItem(key, value, isEdit = false) {
    if (isEdit) {
      setEditForm(f => ({
        ...f,
        [key]: f[key].includes(value) ? f[key].filter(x => x !== value) : [...f[key], value]
      }))
    } else {
      setForm(f => ({
        ...f,
        [key]: f[key].includes(value) ? f[key].filter(x => x !== value) : [...f[key], value]
      }))
    }
  }

  async function handleAddGroup() {
    if (!newGroupName.trim()) return
    const { error } = await supabase.from('groups').insert({ name: newGroupName.trim() })
    if (error) return alert('新增失敗，組別名稱可能已存在')
    setNewGroupName('')
    fetchGroups()
  }

  async function handleDeleteGroup(id, name) {
    if (!confirm(`確定刪除「${name}」組別？`)) return
    await supabase.from('groups').delete().eq('id', id)
    fetchGroups()
  }

  async function handleAddSkill() {
    if (!newSkillName.trim()) return
    const { error } = await supabase.from('skills').insert({ name: newSkillName.trim() })
    if (error) return alert('新增失敗，特長名稱可能已存在')
    setNewSkillName('')
    fetchSkills()
  }

  async function handleDeleteSkill(id, name) {
    if (!confirm(`確定刪除「${name}」特長？`)) return
    await supabase.from('skills').delete().eq('id', id)
    fetchSkills()
  }

  function askDelete(id) {
    if (adminUnlocked) { confirmDelete(id) }
    else { setPendingDeleteId(id); setShowAdminModal(true) }
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
      if (pendingDeleteId) { confirmDelete(pendingDeleteId); setPendingDeleteId(null) }
    } else {
      setPwError('密碼錯誤，請重試')
    }
  }

  async function handleExport() {
    await exportVolunteers(volunteers)
  }

  // 多選標籤元件
  function TagSelector({ options, selected, onToggle, colorMap = {} }) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onToggle(opt)}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${
              selected.includes(opt)
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    )
  }

  const displayed = volunteers
    .filter(v => {
      if (filter === 'all') return true
      const gnames = v.group_names?.length ? v.group_names : [v.group_name]
      return gnames.includes(filter)
    })
    .filter(v => !search ||
      v.name.includes(search) ||
      (v.phone || '').includes(search) ||
      (v.volunteer_no || '').includes(search) ||
      (v.volunteer_no || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''))
    )

  // Modal 表單內容（新增/編輯共用結構）
  function VolForm({ f, setF, isEdit }) {
    return (
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">志工編號</label>
          <input className="input" value={f.volunteer_no}
            onChange={e => setF(prev => ({ ...prev, volunteer_no: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">姓名 *</label>
          <input className="input" value={f.name}
            onChange={e => setF(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">組別 * （可多選）</label>
          <TagSelector options={groups.map(g => g.name)} selected={f.group_names}
            onToggle={v => toggleItem('group_names', v, isEdit)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">身分別（可多選）</label>
          <TagSelector options={IDENTITIES} selected={f.identities}
            onToggle={v => toggleItem('identities', v, isEdit)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">特長（可多選）</label>
          <TagSelector options={skills.map(s => s.name)} selected={f.skill_names}
            onToggle={v => toggleItem('skill_names', v, isEdit)} />
          {adminUnlocked && (
            <div className="flex gap-2 mt-2">
              <input className="input flex-1 text-xs" placeholder="新增特長..."
                value={newSkillName} onChange={e => setNewSkillName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill()} />
              <button onClick={handleAddSkill} className="btn btn-secondary text-xs">新增</button>
            </div>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">電話</label>
          <input className="input" value={f.phone}
            onChange={e => setF(prev => ({ ...prev, phone: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">備註</label>
          <input className="input" value={f.note}
            onChange={e => setF(prev => ({ ...prev, note: e.target.value }))} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between gap-2">
        <h1 className="text-base font-semibold text-gray-800 shrink-0">志工資料管理</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn btn-success text-xs">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">匯出 Excel</span>
          </button>
          <button onClick={async () => {
            const nextNo = await getNextVolNo()
            setForm({ ...emptyForm, volunteer_no: nextNo })
            setShowAdd(true)
          }} className="btn btn-primary text-xs">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">新增志工</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        {/* 組別篩選卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <button onClick={() => setFilter('all')}
            className={`card border-t-2 border-t-blue-400 text-left transition-all hover:shadow-md ${filter === 'all' ? 'shadow-md' : ''}`}>
            <div className="text-xs text-gray-400">全體</div>
            <div className="text-2xl font-semibold text-gray-800 mt-0.5">{volunteers.length}</div>
            <div className="text-xs text-gray-400">人</div>
          </button>
          {groups.map(g => {
            const count = volunteers.filter(v => {
              const gnames = v.group_names?.length ? v.group_names : [v.group_name]
              return gnames.includes(g.name)
            }).length
            return (
              <button key={g.id} onClick={() => setFilter(g.name)}
                className={`card border-t-2 border-t-gray-300 text-left transition-all hover:shadow-md ${filter === g.name ? 'shadow-md' : ''}`}>
                <div className="text-xs text-gray-400">{g.name}組</div>
                <div className="text-2xl font-semibold text-gray-800 mt-0.5">{count}</div>
                <div className="text-xs text-gray-400">人</div>
              </button>
            )
          })}
          {adminUnlocked && (
            <button onClick={() => setShowAddGroup(true)}
              className="card border-t-2 border-dashed border-gray-200 hover:shadow-md flex flex-col items-center justify-center py-4">
              <Plus className="w-5 h-5 text-gray-400" />
              <div className="text-xs text-gray-400 mt-1">管理組別</div>
            </button>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input className="input pl-8 text-xs w-full" placeholder="搜尋姓名、編號或電話..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span className="text-xs text-gray-400 shrink-0">共 {displayed.length} 人</span>
            {adminUnlocked && <span className="badge badge-red">管理員模式</span>}
            <button onClick={() => {
              if (adminUnlocked) setAdminUnlocked(false)
              else setShowAdminModal(true)
            }} className={`btn text-xs ${adminUnlocked ? 'btn-danger' : 'btn-secondary'}`}>
              {adminUnlocked ? '登出管理員' : '🔒 管理員'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '500px' }}>
              <thead>
                <tr>
                  <th className="table-th">編號</th>
                  <th className="table-th">姓名</th>
                  <th className="table-th">組別</th>
                  <th className="table-th hidden sm:table-cell">身分</th>
                  <th className="table-th hidden sm:table-cell">特長</th>
                  <th className="table-th hidden sm:table-cell">電話</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">尚無志工資料</td></tr>
                ) : displayed.map(v => {
                  const gnames = v.group_names?.length ? v.group_names : [v.group_name].filter(Boolean)
                  return (
                    <tr key={v.id}>
                      <td className="table-td text-gray-500 font-mono whitespace-nowrap">{v.volunteer_no || '—'}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600 shrink-0">
                            {v.name[0]}
                          </div>
                          <span className="font-medium">{v.name}</span>
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="flex gap-1 flex-wrap">
                          {gnames.map(g => (
                            <span key={g} className={`badge ${GROUP_COLORS[g] || 'badge-gray'}`}>{g}</span>
                          ))}
                        </div>
                      </td>
                      <td className="table-td hidden sm:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(v.identities || []).map(i => (
                            <span key={i} className="badge badge-gray text-xs">{i}</span>
                          ))}
                        </div>
                      </td>
                      <td className="table-td hidden sm:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {(v.skill_names || []).map(s => (
                            <span key={s} className="badge badge-blue text-xs">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="table-td text-gray-500 hidden sm:table-cell">{v.phone || '—'}</td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          {adminUnlocked && (
                            <button onClick={() => openEdit(v)}
                              className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => askDelete(v.id)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 新增志工 Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">新增志工</h3>
              <button onClick={() => setShowAdd(false)} className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <VolForm f={form} setF={setForm} isEdit={false} />
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

      {/* 編輯志工 Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">編輯志工</h3>
              <button onClick={() => setShowEdit(false)} className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <VolForm f={editForm} setF={setEditForm} isEdit={true} />
            <div className="flex gap-2 mt-5">
              <button onClick={handleEdit} disabled={submitting}
                className="btn btn-primary flex-1 justify-center disabled:opacity-60">
                {submitting ? '儲存中...' : '儲存變更'}
              </button>
              <button onClick={() => setShowEdit(false)} className="btn btn-secondary">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 管理組別 Modal */}
      {showAddGroup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">管理組別</h3>
              <button onClick={() => setShowAddGroup(false)} className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">新增組別</label>
                <div className="flex gap-2">
                  <input className="input flex-1" value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                    placeholder="輸入組別名稱" />
                  <button onClick={handleAddGroup} className="btn btn-primary">新增</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">現有組別</label>
                <div className="space-y-1">
                  {groups.map(g => (
                    <div key={g.id} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <span className="text-sm">{g.name}</span>
                      <button onClick={() => handleDeleteGroup(g.id, g.name)}
                        className="p-1 text-gray-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setShowAddGroup(false)} className="btn btn-secondary w-full justify-center mt-4">關閉</button>
          </div>
        </div>
      )}

      {/* 管理員 Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">管理員驗證</h3>
              <button onClick={() => { setShowAdminModal(false); setPwInput(''); setPwError('') }}
                className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">請輸入管理員密碼以執行刪除與編輯</p>
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