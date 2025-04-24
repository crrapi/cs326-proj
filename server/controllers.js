const getRootHandler = (req, res) => {
    res.status(200).json({ message: 'Welcome to the API!' });
};

const getHelloHandler = (req, res) => {
    const name = req.query.name || 'World';
    res.status(200).json({ message: `Hello, ${name}!` });
};

module.exports = {
    getRootHandler,
    getHelloHandler,
};
