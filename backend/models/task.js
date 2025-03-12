const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Task = sequelize.define('Task', {
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  deadline: { type: DataTypes.DATE, allowNull: false },
  priority: { type: DataTypes.ENUM('high', 'medium', 'low'), defaultValue: 'medium' },
  status: { 
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'), 
    defaultValue: 'pending' 
  },
  userId: { 
    type: DataTypes.INTEGER, 
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }
}, {
  timestamps: true
});

Task.belongsTo(User, { foreignKey: 'userId', as: 'assignedTo' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
User.hasMany(Task, { foreignKey: 'userId' });

module.exports = Task;
