const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        username: { type: DataTypes.STRING, unique: true, allowNull: false },
        cashWithdrawnFromSales: { type: DataTypes.FLOAT, defaultValue: 0 }
    });
    return User;
};