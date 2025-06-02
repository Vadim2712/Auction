// src/pages/ManageUsersPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { adminGetAllUsers, adminUpdateUserStatus, adminUpdateUserRoles } from '../services/apiClient';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import './ManageUsersPage.css';

const ManageUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 0 });

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // Пользователь, чьи роли редактируются
    const [selectedRolesInModal, setSelectedRolesInModal] = useState([]);
    const [actionError, setActionError] = useState(''); // Ошибки для действий (смена статуса, ролей)
    const [submittingAction, setSubmittingAction] = useState(false);

    const availableBusinessRolesForAssignment = [
        { value: 'buyer', label: 'Покупатель' },
        { value: 'seller', label: 'Продавец' },
        // 'auction_manager' больше не назначается отдельно
    ];

    const fetchUsers = useCallback(async (page = 1, pageSize = 10) => {
        setLoading(true);
        setError('');
        try {
            const response = await adminGetAllUsers({ page, pageSize });
            setUsers(response.data.data.map(u => ({
                ...u,
                // Убедимся, что availableBusinessRoles - это массив, даже если пришел как строка
                availableBusinessRoles: typeof u.availableBusinessRoles === 'string'
                    ? JSON.parse(u.availableBusinessRoles)
                    : (Array.isArray(u.availableBusinessRoles) ? u.availableBusinessRoles : [])
            })));
            setPagination(response.data.pagination);
        } catch (err) {
            console.error("Ошибка загрузки пользователей:", err);
            setError('Не удалось загрузить список пользователей. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(pagination.currentPage, pagination.pageSize);
    }, [fetchUsers, pagination.currentPage, pagination.pageSize]); // Добавили зависимости для перезагрузки при смене страницы

    const handleStatusToggle = async (userId, currentIsActive) => {
        const actionText = currentIsActive ? 'заблокировать' : 'активировать';
        if (!window.confirm(`Вы уверены, что хотите ${actionText} этого пользователя (ID: ${userId})?`)) return;

        setActionError('');
        setSubmittingAction(true);
        try {
            await adminUpdateUserStatus(userId, !currentIsActive);
            fetchUsers(pagination.currentPage, pagination.pageSize); // Обновить список
            alert(`Статус пользователя ID: ${userId} успешно изменен.`);
        } catch (err) {
            console.error("Ошибка изменения статуса:", err);
            setActionError('Ошибка изменения статуса: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingAction(false);
        }
    };

    const openRoleModal = (user) => {
        setEditingUser(user);
        setSelectedRolesInModal(user.availableBusinessRoles || []);
        setIsRoleModalOpen(true);
        setActionError('');
    };

    const handleRoleCheckboxChange = (roleValue) => {
        setSelectedRolesInModal(prev =>
            prev.includes(roleValue)
                ? prev.filter(r => r !== roleValue)
                : [...prev, roleValue]
        );
    };

    const handleSaveRoles = async () => {
        if (!editingUser) return;
        setActionError('');
        setSubmittingAction(true);
        try {
            await adminUpdateUserRoles(editingUser.id, selectedRolesInModal);
            setIsRoleModalOpen(false);
            setEditingUser(null);
            fetchUsers(pagination.currentPage, pagination.pageSize); // Обновить список
            alert(`Роли для пользователя ID: ${editingUser.id} успешно обновлены.`);
        } catch (err) {
            console.error("Ошибка изменения ролей:", err);
            setActionError('Ошибка изменения ролей: ' + (err.response?.data?.message || err.message));
        } finally {
            setSubmittingAction(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const tableHeaders = [
        { label: 'ID' },
        { label: 'ФИО' },
        { label: 'Email' },
        { label: 'Статус' },
        { label: 'Доступные роли' },
        { label: 'Действия' },
    ];

    if (loading && users.length === 0) { // Показываем лоадер только при первой загрузке
        return <Loader text="Загрузка пользователей..." />;
    }

    return (
        <div className="manage-users-page container">
            <h1>Управление пользователями</h1>
            {error && <Alert message={error} type="danger" onClose={() => setError('')} />}
            {actionError && <Alert message={actionError} type="danger" onClose={() => setActionError('')} />}

            <Table
                headers={tableHeaders}
                data={users}
                renderRow={(user) => (
                    <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.fullName}</td>
                        <td>{user.email}</td>
                        <td>{user.isActive ? <span className="status-active">Активен</span> : <span className="status-inactive">Заблокирован</span>}</td>
                        <td>{(user.availableBusinessRoles || []).join(', ')}</td>
                        <td className="actions-cell">
                            <Button
                                variant={user.isActive ? "warning" : "success"}
                                onClick={() => handleStatusToggle(user.id, user.isActive)}
                                disabled={submittingAction}
                                className="button-sm"
                            >
                                {user.isActive ? 'Блок.' : 'Актив.'}
                            </Button>
                            <Button
                                variant="info"
                                onClick={() => openRoleModal(user)}
                                disabled={submittingAction}
                                className="button-sm"
                            >
                                Роли
                            </Button>
                        </td>
                    </tr>
                )}
                emptyMessage="Пользователи не найдены или не соответствуют фильтрам."
            />

            {/* Простая пагинация */}
            {pagination.totalPages > 1 && (
                <div className="pagination-controls">
                    <Button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage === 1 || loading}>
                        Назад
                    </Button>
                    <span>Страница {pagination.currentPage} из {pagination.totalPages} (Всего: {pagination.totalItems})</span>
                    <Button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage === pagination.totalPages || loading}>
                        Вперед
                    </Button>
                </div>
            )}

            {editingUser && (
                <Modal
                    isOpen={isRoleModalOpen}
                    onClose={() => setIsRoleModalOpen(false)}
                    title={`Редактировать роли для: ${editingUser.fullName}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)} disabled={submittingAction}>Отмена</Button>
                            <Button variant="primary" onClick={handleSaveRoles} disabled={submittingAction}>
                                {submittingAction ? 'Сохранение...' : 'Сохранить роли'}
                            </Button>
                        </>
                    }
                >
                    {actionError && <Alert message={actionError} type="danger" onClose={() => setActionError('')} />}
                    <p>Выберите доступные бизнес-роли:</p>
                    {availableBusinessRolesForAssignment.map(roleOption => (
                        <div key={roleOption.value} className="form-check">
                            <input
                                type="checkbox"
                                id={`role-${roleOption.value}-${editingUser.id}`}
                                value={roleOption.value}
                                checked={selectedRolesInModal.includes(roleOption.value)}
                                onChange={() => handleRoleCheckboxChange(roleOption.value)}
                                className="form-check-input"
                                disabled={submittingAction}
                            />
                            <label htmlFor={`role-${roleOption.value}-${editingUser.id}`} className="form-check-label">
                                {roleOption.label}
                            </label>
                        </div>
                    ))}
                </Modal>
            )}
        </div>
    );
};

export default ManageUsersPage;