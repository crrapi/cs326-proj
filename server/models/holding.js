const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Holding = sequelize.define('Holding', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        entryId: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, unique: true },
        symbol: { type: DataTypes.STRING, allowNull: false },
        quantity: { type: DataTypes.FLOAT, allowNull: false },
        purchaseDate: { type: DataTypes.DATEONLY, allowNull: false },
        purchasePrice: { type: DataTypes.FLOAT, allowNull: false },
        sellDate: { type: DataTypes.DATEONLY, allowNull: true },
        sellPrice: { type: DataTypes.FLOAT, allowNull: true },
        soldQuantity: { type: DataTypes.FLOAT, defaultValue: 0 }
    });
    return Holding;
};