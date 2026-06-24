import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'

const BRAND_COLOR = '009B77'

function applyHeaderStyle(row) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BRAND_COLOR } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' }
    }
  })
}

function applyDataStyle(row, even) {
  row.eachCell(cell => {
    cell.alignment = { vertical: 'middle' }
    cell.border = {
      top: { style: 'hair' }, left: { style: 'hair' },
      bottom: { style: 'hair' }, right: { style: 'hair' }
    }
    if (even) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F9F7' } }
  })
}

// 志工名單
export async function exportVolunteers(volunteers) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣癌症基金會'
  const ws = wb.addWorksheet('志工名單')

  ws.mergeCells('A1:E1')
  const title = ws.getCell('A1')
  title.value = '台灣癌症基金會 - 志工名單'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  ws.addRow([])
  const hdr = ws.addRow(['姓名', '組別', '電話', '備註', '加入日期'])
  hdr.height = 22
  applyHeaderStyle(hdr)
  ws.columns = [
    { width: 14 }, { width: 10 }, { width: 16 }, { width: 24 }, { width: 14 }
  ]

  volunteers.forEach((v, i) => {
    const row = ws.addRow([
      v.name, v.group_name, v.phone || '—', v.note || '—',
      v.created_at ? format(new Date(v.created_at), 'yyyy/MM/dd') : '—'
    ])
    row.height = 18
    applyDataStyle(row, i % 2 === 0)
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), '志工名單_' + format(new Date(), 'yyyyMMdd') + '.xlsx')
}

// 服務紀錄
export async function exportServiceRecords(records) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣癌症基金會'
  const ws = wb.addWorksheet('服務紀錄')

  ws.mergeCells('A1:F1')
  const title = ws.getCell('A1')
  title.value = '台灣癌症基金會 - 服務紀錄'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  ws.addRow([])
  const hdr = ws.addRow(['日期', '志工', '組別', '時段', '時數', '簽到時間', '簽退時間'])
  hdr.height = 22
  applyHeaderStyle(hdr)
  ws.columns = [
    { width: 13 }, { width: 12 }, { width: 9 }, { width: 16 }, { width: 8 }, { width: 13 }
  ]
  ws.columns = [
  { width: 13 }, { width: 12 }, { width: 9 }, { width: 16 }, { width: 8 }, { width: 12 }, { width: 12 }
]

  let totalHours = 0
  records.forEach((r, i) => {
    totalHours += r.hours || 0
    const row = ws.addRow([
  r.date || '—', r.volunteer_name, r.group_name,
  (r.time_start || '—') + '–' + (r.time_end || '—'),
  r.hours || 0,
  r.checked_in_at ? format(new Date(r.checked_in_at), 'HH:mm') : '—',
  r.checked_out_at ? format(new Date(r.checked_out_at), 'HH:mm') : '—'
])
    row.height = 18
    applyDataStyle(row, i % 2 === 0)
  })

  ws.addRow([])
  const sumRow = ws.addRow(['', '', '', '合計時數', totalHours, ''])
  sumRow.getCell(4).font = { bold: true }
  sumRow.getCell(5).font = { bold: true, color: { argb: 'FF1d6fb8' } }

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), '服務紀錄_' + format(new Date(), 'yyyyMMdd') + '.xlsx')
}

// 捐髮日誌
export async function exportHairLogs(logs) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣癌症基金會'
  const ws = wb.addWorksheet('捐髮工作日誌')

  ws.mergeCells('A1:J1')
  const title = ws.getCell('A1')
  title.value = '台灣癌症基金會 - 捐髮工作日誌'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  ws.addRow([])
  const hdr = ws.addRow(['日期', '志工', '拆信封數', 'Excel建檔', '列印編號', '感謝卡', '郵寄', '現場捐髮', '接聽專線', '備註'])
  hdr.height = 22
  applyHeaderStyle(hdr)
  ws.columns = [
    { width: 13 }, { width: 12 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 10 }, { width: 10 }, { width: 12 }, { width: 12 }, { width: 24 }
  ]

  logs.forEach((r, i) => {
    const row = ws.addRow([
      r.date || '—', r.volunteer_name,
      r.letters || 0, r.excel_count || 0, r.print_range || '—',
      r.thank_cards || 0, r.mail_count || 0,
      r.walkin_count || 0, r.phone_calls || 0, r.note || '—'
    ])
    row.height = 18
    applyDataStyle(row, i % 2 === 0)
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), '捐髮工作日誌_' + format(new Date(), 'yyyyMMdd') + '.xlsx')
}

// 課程報名名單
export async function exportCourseEnrollments(course, enrollments) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣癌症基金會'
  const ws = wb.addWorksheet('報名名單')

  ws.mergeCells('A1:D1')
  const title = ws.getCell('A1')
  title.value = '台灣癌症基金會 - ' + course.title + ' 報名名單'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  ws.addRow(['課程日期', course.date || '—'])
  ws.addRow(['講師', course.instructor || '—'])
  ws.addRow(['時數', (course.hours || 0) + ' 小時'])
  ws.addRow([])

  const hdr = ws.addRow(['#', '姓名', '組別', '報名日期', '出席'])
  applyHeaderStyle(hdr)
  ws.columns = [{ width: 6 }, { width: 14 }, { width: 10 }, { width: 14 }, { width: 10 }]

  enrollments.forEach((e, i) => {
    const row = ws.addRow([
      i + 1, e.volunteer_name, e.group_name,
      e.enrolled_at ? format(new Date(e.enrolled_at), 'yyyy/MM/dd') : '—',
      e.attended ? '✓ 已出席' : '未出席'
    ])
    row.height = 18
    applyDataStyle(row, i % 2 === 0)
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), course.title + '_報名名單_' + format(new Date(), 'yyyyMMdd') + '.xlsx')
}

// 月排班表
export async function exportSchedule(year, month, shifts) {
  const wb = new ExcelJS.Workbook()
  wb.creator = '台灣癌症基金會'
  const ws = wb.addWorksheet('排班表')
  const monthStr = year + '年' + (month + 1) + '月'

  ws.mergeCells('A1:E1')
  const title = ws.getCell('A1')
  title.value = '台灣癌症基金會 - ' + monthStr + '排班表'
  title.font = { bold: true, size: 14 }
  title.alignment = { horizontal: 'center' }

  ws.addRow([])
  const hdr = ws.addRow(['日期', '志工', '組別', '開始時間', '結束時間'])
  hdr.height = 22
  applyHeaderStyle(hdr)
  ws.columns = [
    { width: 13 }, { width: 12 }, { width: 9 }, { width: 12 }, { width: 12 }
  ]

  shifts.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((s, i) => {
    const row = ws.addRow([
      s.date || '—', s.volunteer_name, s.group_name,
      s.time_start?.slice(0, 5) || '—',
      s.time_end?.slice(0, 5) || '—'
    ])
    row.height = 18
    applyDataStyle(row, i % 2 === 0)
  })

  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), monthStr + '排班表_' + format(new Date(), 'yyyyMMdd') + '.xlsx')
}