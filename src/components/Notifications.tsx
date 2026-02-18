'use client'

import { useState, useEffect, useRef } from 'react'
import { getNotifications, markAsRead, syncNotifications } from '@/app/actions/notification'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './Notifications.module.css'

export default function Notifications() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    const fetchNotifications = async () => {
        try {
            const data = await getNotifications()
            setNotifications(data)
            setUnreadCount(data.filter((n: any) => !n.read).length)
        } catch (error) {
            console.error('Failed to fetch notifications', error)
        }
    }

    // Initial sync and fetch
    useEffect(() => {
        const init = async () => {
            // Trigger sync (optional here, maybe better on login or periodic)
            // But doing it here ensures user sees fresh data on load
            await syncNotifications()
            await fetchNotifications()
        }
        init()

        // Poll every minute? Maybe too expensive. 
        // Let's stick to load time for now.
    }, [])

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [dropdownRef])

    const handleMarkAsRead = async (id: string, link?: string) => {
        setLoading(true)
        await markAsRead(id)
        await fetchNotifications()
        setLoading(false)
        if (link) {
            setIsOpen(false)
            router.push(link)
        }
    }

    const toggleOpen = () => setIsOpen(!isOpen)

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button className={styles.bellButton} onClick={toggleOpen}>
                🔔
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Notificações</h3>
                        <button className={styles.refreshBtn} onClick={fetchNotifications}>🔄</button>
                    </div>
                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className={styles.empty}>Nenhuma notificação</div>
                        ) : (
                            notifications.map(notif => (
                                <div key={notif.id} className={`${styles.item} ${notif.read ? styles.read : styles.unread}`}>
                                    <div className={styles.itemHeader}>
                                        <span className={styles.title}>{notif.title}</span>
                                        <span className={styles.date}>{new Date(notif.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className={styles.message}>{notif.message}</p>
                                    <div className={styles.actions}>
                                        {notif.link && (
                                            <button
                                                className={styles.linkBtn}
                                                onClick={() => handleMarkAsRead(notif.id, notif.link)}
                                            >
                                                Ver Detalhes
                                            </button>
                                        )}
                                        {!notif.read && (
                                            <button
                                                className={styles.markBtn}
                                                onClick={() => handleMarkAsRead(notif.id)}
                                                disabled={loading}
                                            >
                                                Marcar lida
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
