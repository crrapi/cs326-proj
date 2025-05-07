const express = require('express');
const controllers = require('./controllers');
const validate = require('./middleware/validationMiddleware');
const { createHoldingSchema } = require('./schemas/holdingSchema');

const router = express.Router();

router.get('/portfolio', controllers.getPortfolio);
router.post('/portfolio/buy', controllers.buyStock);
router.post('/portfolio/sell', controllers.sellStock);
router.get('/portfolio/realtime-graph', controllers.getRealtimeGraphData);

router.get('/users', controllers.listUsers);
router.post('/users', controllers.createUser);
router.get('/users/:userId', controllers.getUser);
router.put('/users/:userId', controllers.updateUser);
router.delete('/users/:userId', controllers.deleteUser);

router.get('/holdings', controllers.listHoldings);
router.post('/holdings', validate(createHoldingSchema), controllers.createHolding);
router.get('/holdings/:id', controllers.getHolding);
router.put('/holdings/:id', controllers.updateHolding);
router.delete('/holdings/:id', controllers.deleteHolding);

module.exports = router;