'use client'

import React from 'react'
import styles from './Pagination.module.css'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    totalCount: number
    pageSize: number
    onPageChange: (page: number) => void
    onPageSizeChange?: (size: number) => void
    itemLabel?: string
    pageSizeOptions?: number[]
}

export default function Pagination({
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    onPageChange,
    onPageSizeChange,
    itemLabel = 'itens',
    pageSizeOptions = [20, 50, 100]
}: PaginationProps) {
    if (totalCount === 0) return null

    const fromItem = Math.min((currentPage - 1) * pageSize + 1, totalCount)
    const toItem = Math.min(currentPage * pageSize, totalCount)

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }

        const pages: (number | string)[] = []
        pages.push(1)

        if (currentPage > 3) {
            pages.push('ellipsis-start')
        }

        const start = Math.max(2, currentPage - 1)
        const end = Math.min(totalPages - 1, currentPage + 1)

        for (let i = start; i <= end; i++) {
            pages.push(i)
        }

        if (currentPage < totalPages - 2) {
            pages.push('ellipsis-end')
        }

        pages.push(totalPages)

        return pages
    }

    const pages = getPageNumbers()

    return (
        <div className={styles.paginationContainer}>
            <div className={styles.infoSection}>
                <span className={styles.totalText}>
                    Mostrando <strong>{fromItem}</strong> - <strong>{toItem}</strong> de <strong>{totalCount}</strong> {itemLabel}
                </span>

                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className={styles.pageSizeSelect}
                        title="Itens por página"
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>
                                {size} por página
                            </option>
                        ))}
                    </select>
                )}
            </div>

            <div className={styles.controlsSection}>
                <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(1)}
                    disabled={currentPage <= 1}
                    title="Primeira Página"
                >
                    <ChevronsLeft size={16} />
                </button>
                
                <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    title="Página Anterior"
                >
                    <ChevronLeft size={16} />
                </button>

                {pages.map((p, idx) => {
                    if (typeof p === 'string') {
                        return <span key={`${p}-${idx}`} className={styles.ellipsis}>...</span>
                    }

                    return (
                        <button
                            key={p}
                            type="button"
                            className={`${styles.pageBtn} ${p === currentPage ? styles.activeBtn : ''}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    )
                })}

                <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    title="Próxima Página"
                >
                    <ChevronRight size={16} />
                </button>

                <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage >= totalPages}
                    title="Última Página"
                >
                    <ChevronsRight size={16} />
                </button>
            </div>
        </div>
    )
}
