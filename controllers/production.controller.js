const { Op } = require('sequelize');
const db = require('../models');
const { success, created, notFound, error, badRequest } = require('../utils/response');

// --- Productions ---
exports.getAllEntries = async (req, res) => {
  try {
    const where = {};
    if (req.query.productType) where.productType = req.query.productType;
    if (req.query.from && req.query.to) {
      where.productionDate = { [Op.between]: [req.query.from, req.query.to] };
    } else if (req.query.from) {
      where.productionDate = { [Op.gte]: req.query.from };
    }
    const entries = await db.ProductionEntry.findAll({ where, order: [['productionDate', 'DESC']] });
    return success(res, entries);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.createEntry = async (req, res) => {
  try {
    const { productType, quantity, productionDate } = req.body;
    if (!productType || !quantity || !productionDate) {
      return badRequest(res, 'Type, quantité et date sont obligatoires');
    }
    const entry = await db.ProductionEntry.create({ ...req.body, createdBy: req.user.id });
    await db.Log.create({
      action: `Production : ${quantity} ${req.body.unit || ''} de ${productType}`,
      module: 'Production', entityType: 'ProductionEntry', entityId: entry.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, entry, 'Production enregistrée');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.deleteEntry = async (req, res) => {
  try {
    const entry = await db.ProductionEntry.findByPk(req.params.id);
    if (!entry) return notFound(res, 'Entrée introuvable');
    await entry.destroy();
    return success(res, null, 'Entrée supprimée');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

// --- Ventes ---
exports.getAllSales = async (req, res) => {
  try {
    const where = {};
    if (req.query.productType) where.productType = req.query.productType;
    if (req.query.from && req.query.to) {
      where.saleDate = { [Op.between]: [req.query.from, req.query.to] };
    }
    const sales = await db.ProductionSale.findAll({ where, order: [['saleDate', 'DESC']] });
    return success(res, sales);
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

exports.createSale = async (req, res) => {
  try {
    const { productType, quantity, unitPrice, saleDate } = req.body;
    if (!productType || !quantity || !unitPrice || !saleDate) {
      return badRequest(res, 'Type, quantité, prix et date sont obligatoires');
    }
    const qty = parseFloat(quantity);
    if (qty <= 0) return badRequest(res, 'La quantité doit être supérieure à 0');

    // ── Vérification du stock disponible ─────────────────────────────────
    const entries = await db.ProductionEntry.findAll({ where: { productType } });
    const sales   = await db.ProductionSale.findAll({ where: { productType } });
    const totalProduit = entries.reduce((s, e) => s + parseFloat(e.quantity || 0), 0);
    const totalVendu   = sales.reduce((s, v) => s + parseFloat(v.quantity || 0), 0);
    const stockDispo   = totalProduit - totalVendu;

    if (qty > stockDispo) {
      return badRequest(res,
        `Stock insuffisant pour "${productType}". ` +
        `Disponible : ${Math.max(0, stockDispo)} unités, demandé : ${qty} unités.`
      );
    }
    // ─────────────────────────────────────────────────────────────────────

    const sale = await db.ProductionSale.create({ ...req.body, createdBy: req.user.id });
    await db.Log.create({
      action: `Vente : ${quantity} ${req.body.unit || ''} de ${productType} à ${unitPrice} FCFA/unité`,
      module: 'Production', entityType: 'ProductionSale', entityId: sale.id,
      userId: req.user.id, userRole: req.role, userMatricule: req.user.matricule,
    });
    return created(res, sale, 'Vente enregistrée');
  } catch (err) {
    return error(res, 'Erreur lors de la création', 500, err.message);
  }
};

exports.deleteSale = async (req, res) => {
  try {
    const sale = await db.ProductionSale.findByPk(req.params.id);
    if (!sale) return notFound(res, 'Vente introuvable');
    await sale.destroy();
    return success(res, null, 'Vente supprimée');
  } catch (err) {
    return error(res, 'Erreur', 500, err.message);
  }
};

// --- Tableau de bord Production ---
exports.getDashboard = async (req, res) => {
  try {
    const types = ['Parpaing', 'Pavé', 'Bordure', 'Hourdi', 'Autre'];
    const entries = await db.ProductionEntry.findAll();
    const sales   = await db.ProductionSale.findAll();

    const summary = types.map(type => {
      const typeEntries = entries.filter(e => e.productType === type);
      const produced = typeEntries.reduce((s, e) => s + parseFloat(e.quantity), 0);
      
      const typeSales = sales.filter(s => s.productType === type)
        .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
      
      const sold      = typeSales.reduce((s, v) => s + parseFloat(v.quantity), 0);
      const revenue   = typeSales.reduce((s, v) => s + parseFloat(v.quantity) * parseFloat(v.unitPrice), 0);
      const lastPrice = typeSales.length ? parseFloat(typeSales[0].unitPrice) : 0;

      // Calcul du coût de production
      const latestEntry = typeEntries.sort((a, b) => new Date(b.productionDate) - new Date(a.productionDate))[0];
      const lastUnitCost = latestEntry ? parseFloat(latestEntry.unitCost || 0) : 0;
      const totalCost = typeEntries.reduce((s, e) => s + (parseFloat(e.quantity) * parseFloat(e.unitCost || 0)), 0);
      const avgUnitCost = produced > 0 ? totalCost / produced : 0;

      return { 
        type, 
        produced, 
        sold, 
        stock: Math.max(0, produced - sold), 
        revenue, 
        lastPrice,
        lastUnitCost,
        avgUnitCost
      };
    }).filter(s => s.produced > 0 || s.sold > 0);

    const totalRevenue = sales.reduce((s, v) => s + parseFloat(v.quantity) * parseFloat(v.unitPrice), 0);

    return success(res, { summary, totalRevenue, entriesCount: entries.length, salesCount: sales.length });
  } catch (err) {
    return error(res, 'Erreur dashboard production', 500, err.message);
  }
};
