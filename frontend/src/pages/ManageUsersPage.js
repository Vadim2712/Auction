// src/pages/ManageUsersPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { adminGetAllUsers, adminUpdateUserStatus, adminUpdateUserRoles } from '../services/apiClient';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination'; // Добавим импорт Pagination
import './ManageUsersPage.css';

const ManageUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(''); // Ошибка загрузки списка
    const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 0 });

    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [selectedRolesInModal, setSelectedRolesInModal] = useState([]);
    const [actionInProgress, setActionInProgress] = useState(false);
    const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' }); // Для ошибок и успеха действий

    const availableBusinessRolesForAssignment = [
        { value: 'buyer', label: 'Покупатель' },
        { value: 'seller', label: 'Продавец' },
    ];

    const clearActionFeedback = () => setActionFeedback({ type: '', message: '' });

    const fetchUsers = useCallback(async (page = 1, pageSize = 10) => {
        setLoading(true);
        setListError('');
        clearActionFeedback();
        try {
            const response = await adminGetAllUsers({ page, pageSize });
            if (response.data && response.data.data) {
                setUsers(response.data.data.map(u => ({
                    ...u,
                    availableBusinessRoles: typeof u.availableBusinessRoles === 'string'
                        ? JSON.parse(u.availableBusinessRoles)
                        : (Array.isArray(u.availableBusinessRoles) ? u.availableBusinessRoles : [])
                })));
                setPagination(response.data.pagination);
            } else {
                setUsers([]);
                setPagination({ currentPage: 1, totalPages: 1, pageSize: 10, totalItems: 0 });
            }
        } catch (err) {
            console.error("Ошибка загрузки пользователей:", err);
            setListError('Не удалось загрузить список пользователей. ' + (err.response?.data?.message || err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers(pagination.currentPage, pagination.pageSize);
    }, [fetchUsers, pagination.currentPage, pagination.pageSize]);

    const handleStatusToggle = async (userId, currentIsActive) => {
        const actionText = currentIsActive ? 'заблокировать' : 'активировать';
        if (!window.confirm(`Вы уверены, что хотите ${actionText} этого пользователя (ID: ${userId})?`)) return;

        clearActionFeedback();
        setActionInProgress(true);
        try {
            await adminUpdateUserStatus(userId, !currentIsActive);
            setActionFeedback({ type: 'success', message: `Статус пользователя ID: ${userId} успешно изменен.` });
            fetchUsers(pagination.currentPage, pagination.pageSize);
        } catch (err) {
            console.error("Ошибка изменения статуса:", err);
            setActionFeedback({ type: 'danger', message: 'Ошибка изменения статуса: ' + (err.response?.data?.message || err.response?.data?.error || err.message) });
        } finally {
            setActionInProgress(false);
        }
    };

    const openRoleModal = (user) => {
        setEditingUser(user);
        setSelectedRolesInModal(user.availableBusinessRoles || []);
        setIsRoleModalOpen(true);
        clearActionFeedback();
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
        clearActionFeedback();
        setActionInProgress(true);
        try {
            await adminUpdateUserRoles(editingUser.id, selectedRolesInModal);
            setIsRoleModalOpen(false);
            setEditingUser(null);
            setActionFeedback({ type: 'success', message: `Роли для пользователя ID: ${editingUser.id} успешно обновлены.` });
            fetchUsers(pagination.currentPage, pagination.pageSize);
        } catch (err) {
            console.error("Ошибка изменения ролей:", err);
            // Ошибка будет отображаться в модальном окне, если оно еще открыто,
            // или как общее сообщение, если модальное окно успело закрыться.
            // Для согласованности, можно всегда отображать ошибку действия в модальном окне.
            setActionFeedback({ type: 'danger', message: 'Ошибка изменения ролей: ' + (err.response?.data?.message || err.response?.data?.error || err.message) });
        } finally {
            setActionInProgress(false);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage && !loading) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const tableHeaders = [ /* ... как было ... */
        { label: 'ID' }, { label: 'ФИО' }, { label: 'Email' },
        { label: 'Статус' }, { label: 'Доступные роли' }, { label: 'Действия' },
    ];

    if (loading && users.length === 0 && pagination.currentPage === 1) {
        return <Loader text="Загрузка пользователей..." />;
    }

    return (
        <div className="manage-users-page container">
            <h1>Управление пользователями</h1>
            {listError && <Alert message={listError} type="danger" onClose={() => setListError('')} />}
            {actionFeedback.message && !isRoleModalOpen && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearActionFeedback} />}

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
                                disabled={actionInProgress}
                                className="button-sm"
                            >
                                {user.isActive ? 'Блок.' : 'Актив.'}
                            </Button>
                            <Button
                                variant="info"
                                onClick={() => openRoleModal(user)}
                                disabled={actionInProgress}
                                className="button-sm"
                            >
                                Роли
                            </Button>
                        </td>
                    </tr>
                )}
                emptyMessage="Пользователи не найдены."
            />

            {pagination.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.totalItems}
                    disabled={loading || actionInProgress}
                />
            )}

            {editingUser && (
                <Modal
                    isOpen={isRoleModalOpen}
                    onClose={() => { setIsRoleModalOpen(false); clearActionFeedback(); }}
                    title={`Редактировать роли для: ${editingUser.fullName}`}
                    footer={
                        <>
                            <Button variant="secondary" onClick={() => { setIsRoleModalOpen(false); clearActionFeedback(); }} disabled={actionInProgress}>Отмена</Button>
                            <Button variant="primary" onClick={handleSaveRoles} disabled={actionInProgress}>
                                {actionInProgress ? 'Сохранение...' : 'Сохранить роли'}
                            </Button>
                        </>
                    }
                >
                    {actionFeedback.message && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearActionFeedback} />}
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
                                disabled={actionInProgress}
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