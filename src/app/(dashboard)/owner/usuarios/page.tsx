'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

type UserRole = 'admin' | 'staff'
type UserStatus = 'active' | 'inactive'

interface User {
    id: string
    name: string
    email: string
    role: UserRole
    status: UserStatus
    created_at: string
    last_login: string | null
}

const mockUsers: User[] = [
    { id: '1', name: 'Tainara Silva', email: 'tainara@srpet.com', role: 'admin', status: 'active', created_at: '2024-01-15', last_login: '2026-02-07' },
    { id: '2', name: 'Carlos Oliveira', email: 'carlos@srpet.com', role: 'staff', status: 'active', created_at: '2024-03-20', last_login: '2026-02-07' },
    { id: '3', name: 'Ana Santos', email: 'ana@srpet.com', role: 'staff', status: 'active', created_at: '2024-06-10', last_login: '2026-02-06' },
    { id: '4', name: 'Pedro Costa', email: 'pedro@srpet.com', role: 'staff', status: 'inactive', created_at: '2024-09-05', last_login: '2025-12-15' },
]

const roleLabels: Record<UserRole, string> = {
    admin: 'Administrador',
    staff: 'Staff'
}

export default function UsuariosPage() {
    const [users, setUsers] = useState<User[]>(mockUsers)
    const [showModal, setShowModal] = useState(false)
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'staff' as UserRole })

    const toggleUserStatus = (userId: string) => {
        setUsers(users.map(u =>
            u.id === userId
                ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
                : u
        ))
    }

    const handleAddUser = () => {
        if (!newUser.name || !newUser.email) return

        const user: User = {
            id: Date.now().toString(),
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            status: 'active',
            created_at: new Date().toISOString().split('T')[0],
            last_login: null
        }

        setUsers([...users, user])
        setNewUser({ name: '', email: '', role: 'staff' })
        setShowModal(false)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <Link href="/owner" className={styles.backLink}>← Voltar</Link>
                    <h1 className={styles.title}>👥 Gestão de Usuários</h1>
                    <p className={styles.subtitle}>Gerencie os funcionários do seu pet shop</p>
                </div>
                <button className={styles.addButton} onClick={() => setShowModal(true)}>
                    + Novo Usuário
                </button>
            </div>

            {/* User Roles Info */}
            <div className={styles.rolesInfo}>
                <div className={styles.roleCard}>
                    <span className={styles.roleIcon}>👑</span>
                    <div>
                        <strong>Administrador</strong>
                        <p>Acesso total: financeiro, usuários, relatórios e todas as operações</p>
                    </div>
                </div>
                <div className={styles.roleCard}>
                    <span className={styles.roleIcon}>🛠️</span>
                    <div>
                        <strong>Staff</strong>
                        <p>Acesso operacional: check-in/out, timeline, fichas de atendimento</p>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Usuário</th>
                            <th>Função</th>
                            <th>Status</th>
                            <th>Último Acesso</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className={styles.userInfo}>
                                        <div className={styles.avatar}>
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className={styles.userName}>{user.name}</span>
                                            <span className={styles.userEmail}>{user.email}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                                        {user.role === 'admin' ? '👑' : '🛠️'} {roleLabels[user.role]}
                                    </span>
                                </td>
                                <td>
                                    <span className={`${styles.statusBadge} ${styles[user.status]}`}>
                                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td>
                                    <span className={styles.lastLogin}>
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleDateString('pt-BR')
                                            : 'Nunca acessou'}
                                    </span>
                                </td>
                                <td>
                                    <div className={styles.actions}>
                                        <button
                                            className={`${styles.actionBtn} ${user.status === 'active' ? styles.deactivate : styles.activate}`}
                                            onClick={() => toggleUserStatus(user.id)}
                                        >
                                            {user.status === 'active' ? 'Desativar' : 'Ativar'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h2>Adicionar Novo Usuário</h2>

                        <div className={styles.formGroup}>
                            <label>Nome Completo</label>
                            <input
                                type="text"
                                value={newUser.name}
                                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                placeholder="Ex: João Silva"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={newUser.email}
                                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                placeholder="joao@petshop.com"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label>Função</label>
                            <div className={styles.roleSelect}>
                                <button
                                    className={`${styles.roleOption} ${newUser.role === 'admin' ? styles.selected : ''}`}
                                    onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                                >
                                    👑 Administrador
                                </button>
                                <button
                                    className={`${styles.roleOption} ${newUser.role === 'staff' ? styles.selected : ''}`}
                                    onClick={() => setNewUser({ ...newUser, role: 'staff' })}
                                >
                                    🛠️ Staff
                                </button>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                                Cancelar
                            </button>
                            <button className={styles.saveBtn} onClick={handleAddUser}>
                                Adicionar Usuário
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
