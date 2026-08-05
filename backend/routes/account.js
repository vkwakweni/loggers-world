const express = require('express');
const accountController = require('../controllers/accountController');

const router = express.Router();

router.delete('/', accountController.deleteAccount);

module.exports = router;
