const { z } = require('zod');

const createHoldingSchema = z.object({
    symbol: z.string({
        required_error: "Symbol is required",
        invalid_type_error: "Symbol must be a string"
    }).trim().min(1, { message: "Symbol cannot be empty" }),

    quantity: z.number({
        required_error: "Quantity is required",
        invalid_type_error: "Quantity must be a number"
    }).int({ message: "Quantity must be a positive integer" })
        .positive({ message: "Quantity must be a positive integer" }),

    purchaseDate: z.string({
        required_error: "Purchase date is required"
    }).regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Purchase date must be in YYYY-MM-DD format" })
        .refine(dateStr => {
            const date = new Date(dateStr + 'T00:00:00Z'); // Using UTC for date-only strings
            return !isNaN(date.getTime());
        }, { message: "Invalid purchase date" }),

    purchasePrice: z.number({
        required_error: "Purchase price is required",
        invalid_type_error: "Purchase price must be a number"
    }).nonnegative({ message: "Purchase price must be a non-negative number" }),

    userId: z.number().int().positive().optional(),

    sellDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Sell date must be in YYYY-MM-DD format" })
        .refine(dateStr => !isNaN(new Date(dateStr + 'T00:00:00Z').getTime()), { message: "Invalid sell date" })
        .nullable().optional(),
    sellPrice: z.number()
        .nonnegative({ message: "Sell price must be a non-negative number" })
        .nullable().optional(),
});

module.exports = { createHoldingSchema };