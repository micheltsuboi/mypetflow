'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { searchPets } from '@/app/actions/pet'
import styles from './PetSearchSelect.module.css'

interface Pet {
    id: string
    name: string
    species: string
    breed: string | null
    customers: {
        name: string
    }
}

interface PetSearchSelectProps {
    name: string
    placeholder?: string
    defaultValue?: string
    initialPets?: Pet[]
    required?: boolean
    onSelect?: (petId: string) => void
    error?: string
}

export default function PetSearchSelect({
    name,
    placeholder = 'Pesquisar pet...',
    defaultValue = '',
    initialPets = [],
    required = false,
    onSelect,
    error
}: PetSearchSelectProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Pet[]>([])
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Initial load if defaultValue is provided (petId)
    useEffect(() => {
        if (defaultValue && !selectedPet) {
            // Try to find pet in initialPets list
            const found = initialPets.find(p => p.id === defaultValue)
            if (found) {
                setSelectedPet(found)
            } else {
                // If not found, maybe it's a new selection being passed back
                // For now, if we don't have the pet info, we can't show it nicely
                // but usually in these pages the pets are already loaded.
            }
        }
    }, [defaultValue, initialPets])

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsSearching(true)
                const res = await searchPets(query)
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

    const handleSelect = (pet: Pet) => {
        setSelectedPet(pet)
        setQuery('')
        setResults([])
        setIsOpen(false)
        if (onSelect) onSelect(pet.id)
    }

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation()
        setSelectedPet(null)
        if (onSelect) onSelect('')
    }

    return (
        <div className={styles.container} ref={containerRef}>
            <input type="hidden" name={name} value={selectedPet?.id || ''} required={required} />
            
            {!selectedPet ? (
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
                            {results.map((pet) => (
                                <div
                                    key={pet.id}
                                    className={styles.resultItem}
                                    onClick={() => handleSelect(pet)}
                                >
                                    <div className={styles.petIcon}>
                                        {pet.species === 'cat' ? '🐱' : '🐶'}
                                    </div>
                                    <div className={styles.petInfo}>
                                        <div className={styles.petName}>{pet.name}</div>
                                        <div className={styles.tutorName}>Tutor: {pet.customers?.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {isOpen && results.length === 0 && query.length >= 2 && !isSearching && (
                        <div className={styles.dropdown}>
                            <div className={styles.noResults}>Nenhum pet encontrado</div>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.selectedPetCard}>
                    <div className={styles.petIcon}>
                        {selectedPet.species === 'cat' ? '🐱' : '🐶'}
                    </div>
                    <div className={styles.selectedPetInfo}>
                        <div className={styles.selectedPetName}>{selectedPet.name}</div>
                        <div className={styles.selectedTutorName}>Tutor: {selectedPet.customers?.name}</div>
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
