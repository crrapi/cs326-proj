const { Sequelize } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
});

const User = require('./user')(sequelize);
const Holding = require('./holding')(sequelize);

User.hasMany(Holding, { foreignKey: 'userId' });
Holding.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Holding };