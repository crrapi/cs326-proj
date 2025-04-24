// Just for reference -___-
// Boy do I love vanilla javascript express backend

type stockEntry = {
    symbol: string;
    amount: number;
    purchaseDate: Date;
    purchasePrice: number; // could be inferred from the date but to add it here would be simpler for calculations
}
