const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        username: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Username cannot be empty." }
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: { msg: "Password cannot be empty." }
            }
        },
        cashWithdrawnFromSales: { type: DataTypes.FLOAT, defaultValue: 0 }
    });

    User.beforeCreate(async (user) => {
        if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    });

    User.prototype.isValidPassword = async function (password) {
        return bcrypt.compare(password, this.password);
    };

    return User;
};