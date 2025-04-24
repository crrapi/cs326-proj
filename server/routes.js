const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

router.get('/portfolio', controllers.getPortfolio);
router.post('/portfolio/buy', controllers.buyStock);
router.post('/portfolio/sell', controllers.sellStock);
router.get('/portfolio/realtime-graph', controllers.getRealtimeGraphData);

module.exports = router;