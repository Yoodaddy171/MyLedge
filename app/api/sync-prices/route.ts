import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { assets } = await request.json();
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key Twelve Data tidak ditemukan di .env.local' }, { status: 500 });
    }

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ error: 'Invalid assets data' }, { status: 400 });
    }

    // Siapkan daftar simbol untuk batch request (agar hemat kuota API)
    // Twelve Data memungkinkan multiple symbols dipisah koma
    const symbols = assets.map(asset => {
      const type = asset.type.toLowerCase();
      if (type === 'gold' || (type === 'other' && asset.symbol === 'XAU')) return 'XAU/USD,USD/IDR';
      // Format IDX untuk Twelve Data adalah SYMBOL (tanpa suffix jika bursa default diset, tapi aman pakai suffix)
      return `${asset.symbol}:IDX`;
    }).join(',');

    // Panggil Twelve Data API
    const url = `https://api.twelvedata.com/price?symbol=${symbols}&apikey=${apiKey}`;
    const response = await fetch(url);
    const priceData = await response.json();

    if (priceData.status === 'error') {
      throw new Error(priceData.message);
    }

    const updatedAssets = assets.map(asset => {
      try {
        let newPrice = asset.current_price;
        const type = asset.type.toLowerCase();

        if (type === 'gold' || (type === 'other' && asset.symbol === 'XAU')) {
          const goldPriceUSD = parseFloat(priceData['XAU/USD']?.price);
          const usdToIdr = parseFloat(priceData['USD/IDR']?.price);
          
          if (goldPriceUSD && usdToIdr) {
            // 1 Troy Ounce = 31.1035 Gram
            newPrice = Math.round((goldPriceUSD * usdToIdr) / 31.1035);
          }
        } else {
          const ticker = `${asset.symbol}:IDX`;
          const stockPrice = parseFloat(priceData[ticker]?.price || priceData[asset.symbol]?.price);
          if (stockPrice) {
            newPrice = Math.round(stockPrice);
          }
        }

        return { id: asset.id, current_price: newPrice };
      } catch (e) {
        return { id: asset.id, current_price: asset.current_price };
      }
    });

    return NextResponse.json({ updatedAssets });
  } catch (error: any) {
    console.error("Twelve Data Sync Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}