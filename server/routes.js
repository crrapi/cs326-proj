const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

router.get('/portfolio', controllers.getPortfolio);
router.get('/portfolio/realtime-graph', controllers.getRealtimeGraphData);

module.exports = router;