import axios from "axios";

const getRate = async () => {

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

    const rates = await getRate();

    const toUSDT = {
        TRX: rates.TRX_USDT,
        ETH: rates.ETH_USDT,
        SOL: rates.SOL_USDT,
        USD: 1,
        USDT: 1,
    };

    const amountInUSDT = amount * toUSDT[fromSymbol];
    const result = amountInUSDT / toUSDT[toSymbol];

    console.log("amountInUSDT==>", amountInUSDT, "toUSDT[fromSymbol]==>", toUSDT[fromSymbol], "toUSDT[toSymbol]==>", toUSDT[toSymbol]);

    return result;
}

// New function to get withdraw rates (crypto to USD)
export const getWithdrawRates = async () => {
    const rates = await getRate();
    return {
        TRX: rates.TRX_USDT,
        ETH: rates.ETH_USDT,
        USDT: rates.USDT_USDT,
        SOL: rates.SOL_USDT,
    };
}