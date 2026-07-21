const express = require('express');
const router = express.Router();
const userRoleController = require('./user-role.controller');
const { validateUserRole } = require('./user-role.validator');

router.get('/user-role', validateUserRole, userRoleController.getUserRole);

module.exports = router;
