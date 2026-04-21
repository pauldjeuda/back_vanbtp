const createRoleModel = require('./role.base.models');
const Chef = createRoleModel('Chef', 'chefs');
module.exports = Chef;
