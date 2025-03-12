import React from 'react';
import './TaskCard.css';

const TaskCard = ({ task, users = {}, onEdit, onDelete }) => {
  const getTaskTitleColor = (task) => {
    if (task.status === 'completed') return 'green';
    if (new Date(task.deadline) < new Date() && task.status !== 'completed') return 'red';
    return 'gray';
  };

  const titleColor = getTaskTitleColor(task);

  return (
    <div className="task-card">
      <h3 style={{ color: titleColor }}>{task.title}</h3>
      <p><strong>Описание:</strong> {task.description}</p>
      <p><strong>Приоритет:</strong> {task.priority}</p>
      <p><strong>Дедлайн:</strong> {new Date(task.deadline).toLocaleDateString()}</p>
      <p><strong>Статус:</strong> {task.status}</p>
      <p><strong>Для кого:</strong> {users[task.userId] || "Загрузка..."}</p>
      <p><strong>Создано:</strong> {new Date(task.createdAt).toLocaleString()}</p>
      <p><strong>Обновлено:</strong> {new Date(task.updatedAt).toLocaleString()}</p>
      <div className="task-card-buttons">
        <button onClick={() => onEdit(task)}>Редактировать</button>
        <button onClick={() => onDelete(task.id)}>Удалить</button>
      </div>
    </div>
  );
};

export default TaskCard;