const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Subcontract = sequelize.define('Subcontract', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  entreprise: { type: DataTypes.STRING(200), allowNull: false },
  objet: { type: DataTypes.TEXT },
  montant: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
  progress: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0, max: 100 } },
  niu:       { type: DataTypes.STRING(20), allowNull: true },
  startDate: { type: DataTypes.DATEONLY },
  endDate:   { type: DataTypes.DATEONLY },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'subcontracts', timestamps: true });

module.exports = Subcontract;
