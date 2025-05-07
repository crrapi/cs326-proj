const validate = (schema) => async (req, res, next) => {
    try {
        const parsedBody = await schema.parseAsync(req.body);
        req.body = parsedBody;
        next();
    } catch (error) {
        if (error.errors && error.errors.length > 0) {
            return res.status(400).json({ error: error.errors[0].message });
        }
        console.error("Unexpected error in validation middleware:", error);
        return res.status(400).json({ error: "Invalid request data" });
    }
};
// basic cover-all to validate the request body with the zod schemas we define in schemas/holdingSchema.js
module.exports = validate;