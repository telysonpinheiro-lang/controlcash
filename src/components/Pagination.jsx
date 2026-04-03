import { useState, useMemo, useEffect, useRef } from 'react'

const PER_PAGE_OPTIONS = [10, 25, 50]

export function usePagination(data, initialPerPage = 10) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(initialPerPage)
  const prevLen = useRef(data.length)

  // Reseta para página 1 quando os dados mudam (filtro/busca)
  useEffect(() => {
    if (data.length !== prevLen.current) {
      setPage(1)
      prevLen.current = data.length
    }
  }, [data.length])

  const totalPages = Math.max(1, Math.ceil(data.length / perPage))
  const safePage = Math.min(page, totalPages)

  const paginated = useMemo(
    () => data.slice((safePage - 1) * perPage, safePage * perPage),
    [data, safePage, perPage]
  )

  function goTo(p) { setPage(Math.max(1, Math.min(p, totalPages))) }
  function changePerPage(n) { setPerPage(n); setPage(1) }

  return { paginated, page: safePage, perPage, totalPages, total: data.length, goTo, changePerPage }
}

export default function Pagination({ page, totalPages, total, perPage, onPageChange, onPerPageChange }) {
  if (total === 0) return null

  const start = (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  function getPages() {
    const pages = []
    const delta = 1
    const left = Math.max(2, page - delta)
    const right = Math.min(totalPages - 1, page + delta)

    pages.push(1)
    if (left > 2) pages.push('...')
    for (let i = left; i <= right; i++) pages.push(i)
    if (right < totalPages - 1) pages.push('...')
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <span>{start}–{end} de {total}</span>
        {onPerPageChange && (
          <select
            className="pagination-select"
            value={perPage}
            onChange={e => onPerPageChange(Number(e.target.value))}
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} / página</option>
            ))}
          </select>
        )}
      </div>
      <div className="pagination-pages">
        <button
          className="pagination-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹
        </button>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-btn ${p === page ? 'active' : ''}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}
        <button
          className="pagination-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ›
        </button>
      </div>
    </div>
  )
}
