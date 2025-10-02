import axios from "axios";

const getRate = async (from: string, to: string) => {

    const { data } = await axios.get(
        "https://api.coingecko.com/api/v3/simple/price",
        {
            params: {
                ids: "tron,ethereum,tether,solana",
                vs_currencies: "usd",
            },
        }
    );

    return {
        TRX_USDT: data.tron.usd,      
        ETH_USDT: data.ethereum.usd,  
        SOL_USDT: data.solana.usd,  
        USDT_USDT: 1
    };
}

export const convert = async (amount, fromSymbol, toSymbol) => {

    const rates = await getRate(fromSymbol, toSymbol);

    const toUSDT = {
        TRX: rates.TRX_USDT,
        ETH: rates.ETH_USDT,
        SOL: rates.SOL_USDT,
        USDT: 1,
    };

    const amountInUSDT = amount * toUSDT[fromSymbol];
    const result = amountInUSDT / toUSDT[toSymbol];

    return result;
}