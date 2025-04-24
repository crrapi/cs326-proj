const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

router.get('/', controllers.getRootHandler);
router.get('/hello', controllers.getHelloHandler);

module.exports = router;