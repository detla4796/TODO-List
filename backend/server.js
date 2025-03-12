const express = require('express');
const cors = require('cors');
const { User, Task } = require('./models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const sequelize = require('./config/database');

const app = express();

// Update CORS configuration
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const { name, surname, patronymic, login, password, role, leaderId } = req.body;

    // Проверяем, если роль "subordinate", то leaderId должен быть указан
    if (role === 'subordinate' && !leaderId) {
      return res.status(400).json({ error: 'Leader ID is required for subordinates' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      surname,
      patronymic,
      login,
      password: hashedPassword,
      role,
      leaderId: role === 'subordinate' ? leaderId : null // Если подчинённый, сохраняем leaderId
    });

    res.status(201).json({
      message: 'User created',
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic,
        login: user.login,
        role: user.role,
        leaderId: user.leaderId
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this endpoint to get all leaders
app.get('/api/leaders', async (req, res) => {
  try {
    const leaders = await User.findAll({
      where: { role: 'leader' },
      attributes: ['id', 'name', 'surname', 'patronymic']
    });
    res.json(leaders);
  } catch (error) {
    console.error('Error fetching leaders:', error);
    res.status(500).json({ error: 'Error fetching leaders' });
  }
});

app.post('/api/auth', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({ where: { login } });

    if (!user) return res.status(401).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic, // Добавляем ФИО!
        login: user.login,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { login, password, name, surname, patronymic, role, leaderId } = req.body;

    // Validation
    if (!login || !password || !name || !surname || !role) {
      return res.status(400).json({ 
        error: 'Необходимо заполнить обязательные поля' 
      });
    }

    // Validate leader if user is not a leader
    if (role === 'user' && !leaderId) {
      return res.status(400).json({ 
        error: 'Необходимо выбрать руководителя' 
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ where: { login } });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Пользователь с таким логином уже существует' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      login,
      password: hashedPassword,
      name,
      surname,
      patronymic: patronymic || null,
      role,
      leaderId: role === 'user' ? leaderId : null
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        login: user.login,
        name: user.name,
        surname: user.surname,
        patronymic: user.patronymic,
        role: user.role,
        leaderId: user.leaderId
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Ошибка при регистрации',
      details: error.message 
    });
  }
});

/**
 * Получение всех пользователей (для отладки)
 */
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'surname', 'login', 'leaderId']
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Error fetching users' });
  }
});

/**
 * Получение списка подчинённых текущего пользователя.
 */
app.get('/api/users/subordinates', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const subordinates = await User.findAll({
      where: { leaderId: decoded.id },
      attributes: ['id', 'name', 'surname', 'login']
    });

    res.json(subordinates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error fetching subordinates' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    console.log('Received task data:', req.body); // Add logging
    const { title, description, priority, status, deadline, userId } = req.body;
    
    // Log all values
    console.log({
      title,
      description,
      priority,
      status,
      deadline,
      userId,
      authHeader: req.headers.authorization ? 'Present' : 'Missing'
    });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser) return res.status(404).json({ error: 'Current user not found' });

    if (!title || !deadline || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        received: { title, deadline, userId }
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status value',
        received: status,
        validValues: validStatuses
      });
    }

    // Validate priority value
    const validPriorities = ['high', 'medium', 'low'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ 
        error: 'Invalid priority value',
        received: priority,
        validValues: validPriorities
      });
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      status: status || 'pending',
      deadline,
      userId,
      createdBy: currentUser.id
    });

    console.log('Task created successfully:', task); // Add logging
    res.status(201).json(task);
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    res.status(500).json({ 
      error: error.message,
      details: error.original ? error.original.message : null
    });
  }
});

app.get('/api/tasks', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    let tasks;

    if (currentUser.role === 'leader') {
      // Находим всех подчинённых
      const subordinates = await User.findAll({
        where: { leaderId: currentUser.id },
        attributes: ['id'] // Получаем только ID подчинённых
      });

      const subordinateIds = subordinates.map(user => user.id); // Извлекаем ID
      subordinateIds.push(currentUser.id); // Добавляем самого руководителя

      // Получаем все задачи для руководителя и его подчинённых
      tasks = await Task.findAll({
        where: { userId: subordinateIds }
      });
    } else {
      // Если подчинённый – получает только свои задачи
      tasks = await Task.findAll({ where: { userId: currentUser.id } });
    }

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET); // Проверяем токен

    const { id } = req.params;
    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// Add this endpoint after your other task routes
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, deadline, userId } = req.body;

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findByPk(decoded.id);

    if (!currentUser) return res.status(404).json({ error: 'Current user not found' });

    // Find the task
    const task = await Task.findByPk(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // Check permissions
    const canEditAllFields = task.createdBy === currentUser.id || currentUser.role === 'leader';

    if (!canEditAllFields && task.status !== status) {
      // If user can only edit status, update only that
      await task.update({ status });
    } else if (canEditAllFields) {
      // Full update for task creator or leader
      await task.update({
        title,
        description,
        priority,
        status,
        deadline,
        userId
      });
    } else {
      return res.status(403).json({ error: 'Insufficient permissions to edit this task' });
    }

    const updatedTask = await Task.findByPk(id);
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this before app.listen()

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// CORS error handler
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

/**
 * Синхронизация базы данных и запуск сервера.
 */
sequelize.sync()
  .then(() => {
    console.log('Database synchronized');
  })
  .catch((error) => {
    console.error('Database sync error:', error);
  });

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));