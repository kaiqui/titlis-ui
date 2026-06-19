import { useEffect, useRef, useState } from 'react'

export function usePagination<T>(items: T[], defaultPageSize = 25, resetKey?: unknown) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const prevLengthRef = useRef(items.length)
  const prevResetKeyRef = useRef(resetKey)

  useEffect(() => {
    if (prevLengthRef.current !== items.length) {
      setPage(1)
      prevLengthRef.current = items.length
    }
  }, [items.length])

  useEffect(() => {
    if (prevResetKeyRef.current !== resetKey) {
      setPage(1)
      prevResetKeyRef.current = resetKey
    }
  }, [resetKey])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = Math.min(start + pageSize, items.length)

  function changePageSize(size: number) {
    setPageSize(size)
    setPage(1)
  }

  return {
    paginatedItems: items.slice(start, end),
    page: safePage,
    pageSize,
    setPage,
    changePageSize,
    totalPages,
    totalItems: items.length,
    startIndex: start,
    endIndex: end,
  }
}
