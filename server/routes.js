const express = require('express');
const controllers = require('./controllers');
const validate = require('./middleware/validationMiddleware');
const { createHoldingSchema } = require('./schemas/holdingSchema');
const authenticateToken = require('./middleware/authMiddleware');

const router = express.Router();
router.post('/auth/signup', controllers.signup);
router.post('/auth/login', controllers.login);

router.get('/portfolio', authenticateToken, controllers.getPortfolio);
router.post('/portfolio/buy', authenticateToken, validate(createHoldingSchema), controllers.buyStock);
router.post('/portfolio/sell', authenticateToken, controllers.sellStock);
router.get('/portfolio/realtime-graph', authenticateToken, controllers.getRealtimeGraphData);

router.get('/users', authenticateToken, controllers.listUsers);
router.get('/users/me', authenticateToken, (req, res) => res.json(req.user));
router.get('/users/:userId', authenticateToken, controllers.getUser);
router.put('/users/:userId', authenticateToken, controllers.updateUser);
router.delete('/users/:userId', authenticateToken, controllers.deleteUser);

router.get('/holdings', authenticateToken, controllers.listHoldings);
router.post('/holdings', authenticateToken, validate(createHoldingSchema), controllers.createHolding);
router.get('/holdings/:id', authenticateToken, controllers.getHolding);
router.put('/holdings/:id', authenticateToken, validate(createHoldingSchema), controllers.updateHolding);
router.delete('/holdings/:id', authenticateToken, controllers.deleteHolding);

module.exports = router;