export type CsvColumn<T> = { header: string; value: (row: T) => unknown }

/** RFC 4180 CSV, with spreadsheet formula injection neutralised (=, +, -, @ prefixes). */
export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const cell = (v: unknown): string => {
    if (v == null) return ''
    let s = Array.isArray(v) ? v.join('; ') : String(v)
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.map((c) => cell(c.header)).join(',')]
  for (const r of rows) lines.push(columns.map((c) => cell(c.value(r))).join(','))
  return lines.join('\r\n')
}

export function downloadCSV<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const blob = new Blob(['﻿' + toCSV(rows, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
