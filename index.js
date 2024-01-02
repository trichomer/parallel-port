require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const walletAddress = process.env.TEST_WALLET_ADDRESS;
console.log(walletAddress)
const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);

const parasetCachingAddress = "0xECa9D81a4dC7119A40481CFF4e7E24DD0aaF56bD";
const parasetCachingABI = require("./constants/abis/parasetCachingABI.json");
const parasetCachingContract = new ethers.Contract(parasetCachingAddress, parasetCachingABI, provider);

const parasets = require("./constants/abis/parasetTokens.json");
const pids = parasets.map(paraset => paraset.pid);

const parallelNftContractAddress = "0x76be3b62873462d2142405439777e971754e8e77";
//const parallelNftContractABI = require("./constants/abis/parallelAbi.json");
//const parallelNftContract = new ethers.Contract(parallelNftContractAddress, parallelNftContractABI, provider);

const collection = "parallelalpha";
const chain = "ethereum";
const key = process.env.OPENSEA_API_KEY;
const headers = {
    'X-API-KEY': key,
};


// Fetch Parallel Alpha NFT last sale price via Opensea APIv2
const fetchSalePrices = async (tokenId) => {
    try {
      const eventsUrl = `https://api.opensea.io/api/v2/events/chain/${chain}/contract/${parallelNftContractAddress}/nfts/${tokenId}`;
      const response = await axios.get(eventsUrl, { headers });
      //console.log(response);
      const events = response.data.asset_events;

      if (events.length > 0 && events[0].payment && events[0].payment.quantity) {
        const salePriceWei = events[0].payment.quantity;
        const currency = events[0].payment.symbol;
        const salePrice = salePriceWei / (10 ** 18);

        console.log(`TokenId ${tokenId} last sale price: ${salePrice} ${currency}`);

        return { salePrice, currency };
      }

      console.log(`No sale data found for tokenId ${tokenId}`);
      return { salePrice: null, currency: null };
    } catch (error) {
      console.error(`Error fetching sale price for tokenId ${tokenId}: `, error);
      return { salePrice: null, currency: null };
    }
};


async function fetchCachedParasets() {
    try {
        let totalValue = 0;
        const parasetValues = {};

        const amounts = await parasetCachingContract.getPoolCacheAmounts(
            pids,
            Array(pids.length).fill(walletAddress)
        );

        for (let index = 0; index < amounts.length; index++) {
            const amount = amounts[index];
            if (amount.gt(0)) {
              const paraset = parasets[index];
              let parasetValue = 0;

              console.log(`${paraset.name} owned: ${amount.toString()}`);
              console.log(`tokenIds in ${paraset.name}: ${paraset.tokenIds.join(', ')}`);

              // Fetch sale price details for each tokenId in the owned paraset
              for (const tokenId of paraset.tokenIds) {
                let {salePrice, currency} = await fetchSalePrices(tokenId);
                if (salePrice && (currency === 'ETH' || currency === 'WETH')) {
                  parasetValue += salePrice;
                }

                parasetValues[paraset.name] = parasetValue;
                totalValue += parasetValue;
                console.log(`${paraset.name} value: ${parasetValue} ETH`)
              }
            }
          }

          console.log(`Total value of cached parasets: ${totalValue} ETH`);

    } catch (error) {
        console.error("Error fetching cached Parasets: ", error);
    }
}

fetchCachedParasets();