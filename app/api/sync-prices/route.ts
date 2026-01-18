import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { assets } = await request.json();

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ error: 'Invalid assets data' }, { status: 400 });
    }

    const updatedAssets = await Promise.all(
      assets.map(async (asset) => {
        try {
          let newPrice = asset.current_price;
          const type = asset.type.toLowerCase();

          if (type === 'gold' || (type === 'other' && asset.symbol === 'XAU')) {
            // Fetch Gold price (XAU/USD) from Yahoo Finance
            const goldResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F`);
            const goldData = await goldResponse.json();
            const goldPriceUSD = goldData?.chart?.result?.[0]?.meta?.regularMarketPrice;

            // Fetch USD/IDR rate
            const usdIdrResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/IDR=X`);
            const usdIdrData = await usdIdrResponse.json();
            const usdToIdr = usdIdrData?.chart?.result?.[0]?.meta?.regularMarketPrice;

            if (goldPriceUSD && usdToIdr) {
              // 1 Troy Ounce = 31.1035 Gram
              newPrice = Math.round((goldPriceUSD * usdToIdr) / 31.1035);
            }
          } else {
            // Format untuk saham IDX di Yahoo Finance adalah SYMBOL.JK
            const yahooSymbol = `${asset.symbol}.JK`;
            const stockResponse = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`);
            const stockData = await stockResponse.json();
            const stockPrice = stockData?.chart?.result?.[0]?.meta?.regularMarketPrice;

            if (stockPrice) {
              newPrice = Math.round(stockPrice);
            }
          }

          return { id: asset.id, current_price: newPrice };
        } catch (e) {
          console.error(`Error fetching price for ${asset.symbol}:`, e);
          return { id: asset.id, current_price: asset.current_price };
        }
      })
    );

    return NextResponse.json({ updatedAssets });
  } catch (error: any) {
    console.error("Yahoo Finance Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}