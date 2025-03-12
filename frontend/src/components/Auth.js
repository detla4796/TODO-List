import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [leaders, setLeaders] = useState([]);
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    name: '',
    surname: '',
    patronymic: '',
    role: 'user',
    leaderId: ''
  });
  const [error, setError] = useState('');

  // Fetch leaders for the dropdown
  useEffect(() => {
    if (!isLogin) {
      fetchLeaders();
    }
  }, [isLogin]);

  const fetchLeaders = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/leaders');
      setLeaders(response.data);
    } catch (error) {
      console.error('Error fetching leaders:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth' : '/api/users';
      const response = await axios.post(`http://localhost:3001${endpoint}`, formData);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin(response.data.user);
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Произошла ошибка');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>{isLogin ? 'Авторизация' : 'Регистрация'}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="registration-grid">
              <div className="form-group">
                <label>Фамилия:</label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Имя:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Отчество:</label>
                <input
                  type="text"
                  name="patronymic"
                  value={formData.patronymic}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Роль:</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  <option value="user">Сотрудник</option>
                  <option value="leader">Руководитель</option>
                </select>
              </div>
            </div>
          )}
          
          <div className={`form-row ${!isLogin ? 'mt-3' : ''}`}>
            <div className="form-group">
              <label>Логин:</label>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Пароль:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {!isLogin && formData.role === 'user' && (
            <div className="form-group mt-3">
              <label>Руководитель:</label>
              <select
                name="leaderId"
                value={formData.leaderId}
                onChange={handleChange}
                required
              >
                <option value="">Выберите руководителя</option>
                {leaders.map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {`${leader.surname} ${leader.name} ${leader.patronymic || ''}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <button type="submit" className="submit-btn">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>{isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}</p>
          <button className="switch-auth-btn" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
