import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Modal.css";
import api from '../api/axiosConfig';
import TaskCard from './TaskCard';
import './Tasks.css';

const Tasks = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState({});
  const [selectedUser, setSelectedUser] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "pending",
    deadline: "",
    userId: user.id,
    createdBy: user.id
  });
  const [subordinates, setSubordinates] = useState([]);
  const [viewMode, setViewMode] = useState('all');

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchSubordinates();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await api.get("/api/tasks");
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const usersResponse = await axios.get("http://localhost:3001/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const usersMap = usersResponse.data.reduce((map, user) => {
        const patronymic = user.patronymic ? ` ${user.patronymic}` : "";
        map[user.id] = `${user.surname} ${user.name}${patronymic}`;
        return map;
      }, {});

      setUsers(usersMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchSubordinates = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("http://localhost:3001/api/users/subordinates", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSubordinates(response.data);
    } catch (error) {
      console.error("Error fetching subordinates:", error);
    }
  };

  const getGroupedTasks = () => {
    let filteredTasks = selectedUser === "all" 
      ? [...tasks] 
      : tasks.filter(task => task.userId.toString() === selectedUser);

    filteredTasks.sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );

    if (viewMode === 'all') {
      return filteredTasks;
    }

    if (viewMode === 'deadline') {
      const today = new Date();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      const weekLater = new Date(today);
      weekLater.setDate(weekLater.getDate() + 7);

      return {
        today: filteredTasks.filter(task => new Date(task.deadline) <= todayEnd) || [],
        week: filteredTasks.filter(task => {
          const deadline = new Date(task.deadline);
          return deadline > todayEnd && deadline <= weekLater;
        }) || [],
        future: filteredTasks.filter(task => new Date(task.deadline) > weekLater) || []
      };
    }

    if (viewMode === 'users') {
      const grouped = {};
      filteredTasks.forEach(task => {
        if (!grouped[task.userId]) {
          grouped[task.userId] = [];
        }
        grouped[task.userId].push(task);
      });
      return grouped;
    }

    return [];
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title || !newTask.deadline || !newTask.userId) {
        alert("Пожалуйста, заполните все обязательные поля (заголовок, дедлайн)");
        return;
      }
  
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Необходима авторизация");
        return;
      }
  
      const taskData = {
        ...newTask,
        status: newTask.status || 'pending',
        priority: newTask.priority || 'medium',
        deadline: new Date(newTask.deadline).toISOString(),
        userId: parseInt(newTask.userId, 10)
      };
  
      console.log('Sending task data:', taskData);
  
      const response = await api.post("/api/tasks", newTask);
  
      console.log('Server response:', response.data);
  
      if (response.data) {
        fetchTasks();
        setShowForm(false);
        setNewTask({
          title: "",
          description: "",
          priority: "medium",
          status: "pending",
          deadline: "",
          userId: user.id
        });
      }
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error response:", error.response?.data);
      alert(`Ошибка при создании задачи: ${error.response?.data?.error || error.message}`);
    }
  };

  const canEditAllFields = (task) => {
    return task.createdBy === user.id || user.role === 'leader';
  };

  const handleEditTask = async () => {
    if (!editTask.title || !editTask.deadline) {
      alert("Заполните все обязательные поля!");
      return;
    }
  
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
  
      if (!canEditAllFields(editTask)) {
        const originalTask = tasks.find(t => t.id === editTask.id);
        if (!originalTask) return;
        
        const updatedTask = {
          ...originalTask,
          status: editTask.status
        };
        
        await axios.put(`http://localhost:3001/api/tasks/${editTask.id}`, updatedTask, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`http://localhost:3001/api/tasks/${editTask.id}`, editTask, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      fetchTasks();
      setEditTask(null);
    } catch (error) {
      console.error("Error editing task:", error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(`http://localhost:3001/api/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="tasks-page">
      <div className="view-controls">
        <button 
          className={viewMode === 'all' ? 'active' : ''} 
          onClick={() => setViewMode('all')}
        >
          Все задачи
        </button>
        <button 
          className={viewMode === 'deadline' ? 'active' : ''} 
          onClick={() => setViewMode('deadline')}
        >
          По срокам
        </button>
        {user.role === 'leader' && (
          <button 
            className={viewMode === 'users' ? 'active' : ''} 
            onClick={() => setViewMode('users')}
          >
            По исполнителям
          </button>
        )}
      </div>

      <div className="task-filters">
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          <option value="all">Все сотрудники</option>
          {Object.entries(users).map(([userId, fullName]) => (
            <option key={userId} value={userId}>
              {fullName}
            </option>
          ))}
        </select>
      </div>

      <div className="tasks-container">
        {viewMode === 'deadline' && (
          <>
            <div className="task-group">
              <h3>На сегодня</h3>
              <div className="task-list">
                {getGroupedTasks().today?.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users}
                    onEdit={setEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
            <div className="task-group">
              <h3>На неделю</h3>
              <div className="task-list">
                {getGroupedTasks().week?.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users}
                    onEdit={setEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
            <div className="task-group">
              <h3>На будущее</h3>
              <div className="task-list">
                {getGroupedTasks().future?.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users}
                    onEdit={setEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {viewMode === 'users' && (
          Object.entries(getGroupedTasks()).map(([userId, userTasks]) => (
            <div key={userId} className="task-group">
              <h3>Исполнитель: {users[userId]}</h3>
              <div className="task-list">
                {userTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    users={users}
                    onEdit={setEditTask}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          ))
        )}

        {viewMode === 'all' && (
          <div className="task-list">
            {getGroupedTasks().map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                users={users}
                onEdit={setEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      <button 
        className="create-task-button" 
        onClick={() => setShowForm(true)}
      >
        +
      </button>

      {showForm && (
      <div className="modal">
        <div className="modal-content">
          <h3>Новая задача</h3>
          <div className="form-group">
            <label>Заголовок</label>
            <input 
              type="text" 
              placeholder="Введите заголовок задачи" 
              value={newTask.title} 
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Описание</label>
            <textarea 
              placeholder="Введите описание задачи" 
              value={newTask.description} 
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Приоритет</label>
            <select 
              value={newTask.priority} 
              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
            </select>
          </div>
          <div className="form-group">
            <label>Статус</label>
            <select 
              value={newTask.status} 
              onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
            >
              <option value="pending">К выполнению</option>
              <option value="in_progress">Выполняется</option>
              <option value="completed">Выполнена</option>
              <option value="cancelled">Отменена</option>
            </select>
          </div>
          <div className="form-group">
            <label>Дедлайн</label>
            <input 
              type="date" 
              value={newTask.deadline} 
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Исполнитель</label>
            <select 
              value={newTask.userId} 
              onChange={(e) => setNewTask({ ...newTask, userId: e.target.value })}
            >
              <option value={user.id}>Я</option>
              {subordinates.map(subordinate => (
                <option key={subordinate.id} value={subordinate.id}>
                  {`${subordinate.surname} ${subordinate.name} ${subordinate.patronymic || ''}`}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button className="btn-cancel" onClick={() => setShowForm(false)}>Отмена</button>
            <button className="btn-submit" onClick={handleCreateTask}>Создать</button>
          </div>
        </div>
      </div>
      )}

      {editTask && (
        <div className="modal">
          <div className="modal-content">
            <h3>Редактировать задачу</h3>
            {canEditAllFields(editTask) ? (
              <>
                <div className="form-group">
                  <label>Заголовок</label>
                  <input 
                    type="text" 
                    value={editTask.title} 
                    onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Описание</label>
                  <textarea 
                    value={editTask.description} 
                    onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Приоритет</label>
                  <select 
                    value={editTask.priority} 
                    onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                  >
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Дедлайн</label>
                  <input 
                    type="date" 
                    value={editTask.deadline} 
                    onChange={(e) => setEditTask({ ...editTask, deadline: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>Исполнитель</label>
                  <select 
                    value={editTask.userId} 
                    onChange={(e) => setEditTask({ ...editTask, userId: e.target.value })}
                  >
                    <option value={user.id}>Я</option>
                    {subordinates.map(subordinate => (
                      <option key={subordinate.id} value={subordinate.id}>
                        {`${subordinate.surname} ${subordinate.name} ${subordinate.patronymic || ''}`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
                <>
                  <div className="read-only-field">
                    <strong>Заголовок:</strong> {editTask.title}
                  </div>
                  <div className="read-only-field">
                    <strong>Описание:</strong> {editTask.description}
                  </div>
                  <div className="read-only-field">
                    <strong>Приоритет:</strong> {editTask.priority}
                  </div>
                  <div className="read-only-field">
                    <strong>Дедлайн:</strong> {new Date(editTask.deadline).toLocaleDateString()}
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Статус</label>
                <select 
                  value={editTask.status} 
                  onChange={(e) => setEditTask({ ...editTask, status: e.target.value })}
                >
                  <option value="pending">К выполнению</option>
                  <option value="in_progress">Выполняется</option>
                  <option value="completed">Выполнена</option>
                  <option value="cancelled">Отменена</option>
                </select>
              </div>
              <div className="modal-buttons">
                <button className="btn-cancel" onClick={() => setEditTask(null)}>Отмена</button>
                <button className="btn-submit" onClick={handleEditTask}>Сохранить</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Tasks;
