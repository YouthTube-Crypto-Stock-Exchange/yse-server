require('dotenv').config();
const express = require('express');
const userRoutes = require('./orders/order');
const orderRoutes = require('./users/user');

const router = express.Router();

router.use(userRoutes);
router.use(orderRoutes);

module.exports = router;