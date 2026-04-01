'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, User } from 'lucide-react'
import { searchTutors } from '@/app/actions/tutor'
import styles from './TutorSearchSelect.module.css'

interface Tutor {
    id: string
    name: string
    phone_1: string | null
}

interface TutorSearchSelectProps {
    name: string
    placeholder?: string
    defaultValue?: string // customerId
    initialTutors?: Tutor[]
    required?: boolean
    onSelect?: (tutorId: string) => void
    error?: string
}

export default function TutorSearchSelect({
    name,
    placeholder = 'Pesquisar tutor...',
    defaultValue = '',
    initialTutors = [],
    required = false,
    onSelect,
    error
}: TutorSearchSelectProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Tutor[]>([])
    const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Initial load if defaultValue is provided (tutorId)
    useEffect(() => {
        if (defaultValue && !selectedTutor) {
            const found = initialTutors.find(t => t.id === defaultValue)
            if (found) {
                setSelectedTutor(found)
            }
        }
    }, [defaultValue, initialTutors])

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true)
                const res = await searchTutors(query)
                if (res.success && res.data) {
                    setResults(res.data as any)
                    setIsOpen(true)
                }
                setIsSearching(false)
            } else {
                setResults([])
                setIsOpen(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (tutor: Tutor) => {
        setSelectedTutor(tutor)
        setQuery('')
        setResults([])
        setIsOpen(false)
        if (onSelect) onSelect(tutor.id)
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedTutor(null)
        if (onSelect) onSelect('')
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <input type="hidden" name={name} value={selectedTutor?.id || ''} required={required} />
            
            {!selectedTutor ? (
                <div className={styles.searchWrapper}>
                    <input
                        type="search"
                        autoComplete="off"
                        className={`${styles.input} ${error ? styles.inputError : ''}`}
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.length >= 2 && setIsOpen(true)}
                    />
                    <div className={styles.iconWrapper}>
                        {isSearching ? <Loader2 className={styles.animateSpin} size={18} /> : <Search size={18} />}
                    </div>

                    {isOpen && results.length > 0 && (
                        <div className={styles.dropdown}>
                            {results.map((tutor) => (
                                <div
                                    key={tutor.id}
                                    className={styles.resultItem}
                                    onClick={() => handleSelect(tutor)}
                                >
                                    <div className={styles.tutorIcon}>
                                        <User size={18} />
                                    </div>
                                    <div className={styles.tutorInfo}>
                                        <div className={styles.tutorName}>{tutor.name}</div>
                                        {tutor.phone_1 && <div className={styles.tutorPhone}>{tutor.phone_1}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {isOpen && results.length === 0 && query.length >= 2 && !isSearching && (
                        <div className={styles.dropdown}>
                            <div className={styles.noResults}>Nenhum tutor encontrado</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.selectedTutorCard}>
                    <div className={styles.tutorIcon}>
                        <User size={18} />
                    </div>
                    <div className={styles.selectedTutorInfo}>
                        <div className={styles.selectedTutorName}>{selectedTutor.name}</div>
                        {selectedTutor.phone_1 && <div className={styles.selectedTutorPhone}>{selectedTutor.phone_1}</div>}
                    </div>
                    <button type="button" className={styles.clearBtn} onClick={clearSelection}>
                        <X size={16} />
                    </button>
                </div>
            )}
            {error && <span className={styles.errorMessage}>{error}</span>}
        </div>
    )
}
