const express = require('express');
const logTypesController = require('../controllers/logTypesController');
const logEntriesController = require('../controllers/logEntriesController');

const router = express.Router();

router.post('/', logTypesController.createLogType);
router.get('/', logTypesController.listLogTypes);
router.get('/:typeId', logTypesController.getLogType);

router.post('/:typeId/entries', logEntriesController.createLogEntry);
router.get('/:typeId/entries', logEntriesController.listLogEntries);
router.patch('/:typeId/entries/:createdAt', logEntriesController.updateLogEntry);
router.delete('/:typeId/entries/:createdAt', logEntriesController.deleteLogEntry);

module.exports = router;
