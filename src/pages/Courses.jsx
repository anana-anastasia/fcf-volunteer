import { exportCourseEnrollments } from '../lib/excel'
import { Download } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { Plus, X, ArrowLeft, Trash2, ChevronRight } from 'lucide-react'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD
const COLORS = ['#534ab7', '#e24b4a', '#3b6d11', '#1d9e75', '#ba7517', '#378add']
const TABS = ['課程總覽', '個人紀錄']

export default function Courses() {
  const [tab, setTab] = useState(0)
  const [courses, setCourses] = useState([])
  const [volunteers, setVolunteers] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [selectedVol, setSelectedVol] = useState('')
  const [personalData, setPersonalData] = useState([])
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [addVolId, setAddVolId] = useState('')
  const [addVolSearch, setAddVolSearch] = useState('')
  const [showAddVolList, setShowAddVolList] = useState(false)
  const [personalSearch, setPersonalSearch] = useState('')
  const [showPersonalList, setShowPersonalList] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', date: '', instructor: '', hours: 3, max_seats: 30, color: COLORS[0] })
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState('')

  useEffect(() => { fetchCourses(); fetchVols() }, [])

  async function fetchCourses() {
    const { data } = await supabase.from('courses').select('*, course_enrollments(count)').order('date')
    if (data) setCourses(data.map(c => ({ ...c, enrolled_count: c.course_enrollments?.[0]?.count || 0 })))
  }

  async function fetchVols() {
    const { data } = await supabase.from('volunteers').select('id, name, group_name, volunteer_no, phone').order('name')
    if (data) setVolunteers(data)
  }

  async function openCourse(course) {
    setSelectedCourse(course)
    const { data } = await supabase.from('course_enrollments')
      .select('*, volunteers(name, group_name)')
      .eq('course_id', course.id)
      .order('enrolled_at')
    if (data) setEnrollments(data.map(e => ({ ...e, volunteer_name: e.volunteers?.name, group_name: e.volunteers?.group_name })))
  }

  async function addEnrollment(volId) {
    if (!volId) return alert('請先選擇志工')
    const { error } = await supabase.from('course_enrollments').insert({
      course_id: selectedCourse.id,
      volunteer_id: volId
    })
    if (error) return alert('新增失敗，此志工可能已報名')
    openCourse(selectedCourse)
  }

  async function toggleAttended(id, current) {
    await supabase.from('course_enrollments').update({ attended: !current }).eq('id', id)
    openCourse(selectedCourse)
  }

  async function deleteEnrollment(id) {
    if (!confirm('確定移除此報名？')) return
    await supabase.from('course_enrollments').delete().eq('id', id)
    openCourse(selectedCourse)
  }

  async function deleteCourse(id) {
    if (!confirm('確定刪除此課程？包含所有報名紀錄')) return
    await supabase.from('courses').delete().eq('id', id)
    setSelectedCourse(null)
    fetchCourses()
  }

  async function addCourse() {
    if (!courseForm.title) return alert('請填寫課程名稱')
    const { error } = await supabase.from('courses').insert({
      ...courseForm,
      hours: parseInt(courseForm.hours),
      max_seats: parseInt(courseForm.max_seats)
    })
    if (error) return alert('新增失敗')
    setShowAddCourse(false)
    setCourseForm({ title: '', date: '', instructor: '', hours: 3, max_seats: 30, color: COLORS[0] })
    fetchCourses()
  }

  async function fetchPersonal(volId) {
    setSelectedVol(volId)
    if (!volId) { setPersonalData([]); return }
    const { data: enrolled } = await supabase.from('course_enrollments').select('course_id, attended').eq('volunteer_id', volId)
    const enrolledMap = new Map((enrolled || []).map(e => [e.course_id, e.attended]))
    const { data: all } = await supabase.from('courses').select('*').order('date')
    if (all) setPersonalData(all.map(c => ({ ...c, completed: enrolledMap.has(c.id), attended: enrolledMap.get(c.id) || false })))
  }

  function handleAdminLogin() {
    if (pwInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true)
      setShowAdminModal(false)
      setPwInput('')
      setPwError('')
    } else {
      setPwError('密碼錯誤，請重試')
    }
  }

  const filterVols = (keyword) => volunteers.filter(v =>
    v.name.includes(keyword) ||
    (v.volunteer_no || '').includes(keyword) ||
    (v.volunteer_no || '').replace(/\D/g, '').includes(keyword.replace(/\D/g, '')) ||
    (v.phone || '').includes(keyword)
  )

  const completedCount = personalData.filter(c => c.attended).length
  const totalHours = personalData.filter(c => c.attended).reduce((a, c) => a + (c.hours || 0), 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">在職教育</h1>
        <button onClick={() => setShowAddCourse(true)} className="btn btn-primary text-xs">
          <Plus className="w-4 h-4" />建立課程
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-5">
        <div className="flex border-b border-gray-100 mb-4">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => { setTab(i); setSelectedCourse(null) }}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-all ${
                tab === i ? 'text-blue-600 border-blue-500 font-medium' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* 課程總覽 */}
        {tab === 0 && !selectedCourse && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {courses.length === 0 && (
              <p className="text-sm text-gray-400 col-span-2 text-center py-8">尚無課程，請點右上角建立課程</p>
            )}
            {courses.map(c => {
              const pct = Math.round((c.enrolled_count / c.max_seats) * 100)
              return (
                <div key={c.id} className="card border-l-4" style={{ borderLeftColor: c.color }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm text-gray-800">{c.title}</div>
                    <span className="text-xs text-gray-400">{c.hours}h</span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-400 mb-3 flex-wrap">
                    {c.date && <span>📅 {c.date}</span>}
                    {c.instructor && <span>👤 {c.instructor}</span>}
                    <span>👥 {c.enrolled_count}/{c.max_seats}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">報名 {pct}%</span>
                    <button onClick={() => openCourse(c)}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                      查看報名 <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 課程報名詳情 */}
        {tab === 0 && selectedCourse && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button onClick={() => setSelectedCourse(null)} className="btn btn-ghost py-1">
                <ArrowLeft className="w-4 h-4" /> 返回
              </button>
              <span className="font-semibold text-gray-800">{selectedCourse.title}</span>
              {selectedCourse.date && <span className="badge badge-gray">{selectedCourse.date}</span>}
              {selectedCourse.instructor && <span className="badge badge-gray hidden sm:inline-flex">{selectedCourse.instructor}</span>}
              <div className="flex-1" />
              <button onClick={() => exportCourseEnrollments(selectedCourse, enrollments)} className="btn btn-success text-xs">
                <Download className="w-3.5 h-3.5" />匯出名單
              </button>
              {adminUnlocked ? (
                <>
                  <button onClick={() => deleteCourse(selectedCourse.id)} className="btn btn-danger text-xs">
                    <Trash2 className="w-3.5 h-3.5" />刪除課程
                  </button>
                  <button onClick={() => setAdminUnlocked(false)} className="btn btn-secondary text-xs">登出</button>
                </>
              ) : (
                <button onClick={() => setShowAdminModal(true)} className="btn btn-secondary text-xs">🔒 管理員</button>
              )}
            </div>
            <div className="card">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-sm text-gray-500">已報名 {enrollments.length} 人 / 名額 {selectedCourse.max_seats} 人</span>
                {/* 新增報名搜尋 */}
                <div className="flex gap-2 items-start">
                  <div className="relative">
                    <input className="input w-44 text-xs" placeholder="搜尋姓名、編號或電話..."
                      value={addVolSearch}
                      onChange={e => {
                        setAddVolSearch(e.target.value)
                        setAddVolId('')
                        setShowAddVolList(true)
                      }} />
                    {addVolSearch && showAddVolList && (
                      <div className="absolute z-10 w-44 mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                        {filterVols(addVolSearch).map(v => (
                          <button key={v.id} type="button"
                            onClick={() => {
                              setAddVolId(v.id)
                              setAddVolSearch(v.name)
                              setShowAddVolList(false)
                            }}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 flex items-center gap-2
                              ${addVolId === v.id ? 'bg-blue-50 text-blue-600' : ''}`}>
                            <span className="text-gray-400 w-10">{v.volunteer_no || '—'}</span>
                            <span>{v.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {addVolId && <p className="text-xs text-green-600 mt-1">✓ {addVolSearch}</p>}
                  </div>
                  <button onClick={() => {
                    addEnrollment(addVolId)
                    setAddVolId('')
                    setAddVolSearch('')
                  }} className="btn btn-primary text-xs">新增</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ minWidth: '420px' }}>
                  <thead><tr>
                    <th className="table-th">#</th>
                    <th className="table-th">姓名</th>
                    <th className="table-th hidden sm:table-cell">組別</th>
                    <th className="table-th hidden sm:table-cell">報名日期</th>
                    <th className="table-th">出席</th>
                    <th className="table-th"></th>
                  </tr></thead>
                  <tbody>
                    {enrollments.length === 0 ? (
                      <tr><td colSpan={6} className="table-td text-center text-gray-400 py-6">尚無報名紀錄</td></tr>
                    ) : enrollments.map((e, i) => (
                      <tr key={e.id}>
                        <td className="table-td text-gray-400">{i + 1}</td>
                        <td className="table-td font-medium">{e.volunteer_name}</td>
                        <td className="table-td hidden sm:table-cell"><span className="badge badge-gray text-xs">{e.group_name}</span></td>
                        <td className="table-td hidden sm:table-cell text-gray-400">
                          {e.enrolled_at ? format(new Date(e.enrolled_at), 'yyyy/MM/dd') : '—'}
                        </td>
                        <td className="table-td">
                          <button onClick={() => toggleAttended(e.id, e.attended)}
                            className={`badge cursor-pointer ${e.attended ? 'badge-green' : 'badge-gray'}`}>
                            {e.attended ? '✓ 已出席' : '未出席'}
                          </button>
                        </td>
                        <td className="table-td">
                          {adminUnlocked && (
                            <button onClick={() => deleteEnrollment(e.id)}
                              className="p-1 text-gray-300 hover:text-red-500">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 個人紀錄 */}
        {tab === 1 && (
          <div>
            <div className="relative w-full md:w-64 mb-4">
              <input className="input" placeholder="搜尋志工姓名、編號或電話..."
                value={personalSearch}
                onChange={e => {
                  setPersonalSearch(e.target.value)
                  setSelectedVol('')
                  setPersonalData([])
                  setShowPersonalList(true)
                }} />
              {personalSearch && showPersonalList && (
                <div className="absolute z-10 w-full mt-1 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                  {filterVols(personalSearch).map(v => (
                    <button key={v.id} type="button"
                      onClick={() => {
                        setPersonalSearch(v.name)
                        setShowPersonalList(false)
                        fetchPersonal(v.id)
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                      <span className="text-gray-400 text-xs w-12">{v.volunteer_no || '—'}</span>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedVol && <p className="text-xs text-green-600 mt-1">✓ 已選擇：{personalSearch}</p>}
            </div>

            {selectedVol && (
              <>
                <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
                  {[['已出席課程', completedCount, '門'], ['累計學習時數', totalHours, '小時'], ['尚未出席', personalData.length - completedCount, '門']].map(([label, val, unit]) => (
                    <div key={label} className="card text-center p-3 md:p-4">
                      <div className="text-xl md:text-2xl font-semibold text-blue-600">{val}</div>
                      <div className="text-[10px] md:text-xs text-gray-400 mt-0.5">{label}<br className="md:hidden" /><span className="hidden md:inline">（{unit}）</span><span className="md:hidden">（{unit}）</span></div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {personalData.map(c => (
                    <div key={c.id} className={`card border-l-4 ${c.attended ? '' : 'opacity-50'}`}
                      style={{ borderLeftColor: c.attended ? c.color : c.completed ? '#93c5fd' : '#e5e7eb' }}>
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-sm text-gray-800">{c.title}</div>
                        <span className={`badge ${c.attended ? 'badge-green' : c.completed ? 'badge-blue' : 'badge-gray'}`}>
                          {c.attended ? '✓ 已出席' : c.completed ? '已報名' : '未報名'}
                        </span>
                      </div>
                      <div className="flex gap-3 text-xs text-gray-400 mt-1.5 flex-wrap">
                        {c.date && <span>📅 {c.date}</span>}
                        <span>⏱ {c.hours}h</span>
                        {c.instructor && <span>👤 {c.instructor}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 建立課程 Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">建立新課程</h3>
              <button onClick={() => setShowAddCourse(false)} className="btn btn-ghost p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {[{ key: 'title', label: '課程名稱 *', type: 'text' }, { key: 'date', label: '日期', type: 'date' },
                { key: 'instructor', label: '講師', type: 'text' }, { key: 'hours', label: '時數', type: 'number' },
                { key: 'max_seats', label: '名額', type: 'number' }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
                  <input type={f.type} className="input" value={courseForm[f.key]}
                    onChange={e => setCourseForm(cf => ({ ...cf, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">顏色</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setCourseForm(cf => ({ ...cf, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 ${courseForm.color === c ? 'border-gray-400' : 'border-transparent'}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={addCourse} className="btn btn-primary flex-1 justify-center">建立課程</button>
              <button onClick={() => setShowAddCourse(false)} className="btn btn-secondary">取消</button>
            </div>
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