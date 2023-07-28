const ethers = require('ethers');
require('dotenv').config();
const { abi } = require("./ERC20.json");

// Step 1: Set up the required environment
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const masterPrivateKey = process.env.MASTER_PRIVATE_KEY;
const numAddresses = process.env.NUM_ADDRESSES || 10;
const destinationAddress = process.env.DEST_ADDR;

async function sendEth(fromAddress, toAddress, amount) {
    const wallet = new ethers.Wallet(fromAddress, provider);
    const transaction = {
      to: toAddress,
      value: ethers.utils.parseEther(amount),
    };
    const signedTransaction = await wallet.signTransaction(transaction);
    const transactionResponse = await provider.sendTransaction(signedTransaction);
    await transactionResponse.wait();
    console.log(`ETH sent from ${fromAddress} to ${toAddress}`);
}

async function sweepTokens() {
    // Step 2: Generate the addresses from master private key
    const masterNode = ethers.HDNodeWallet.fromExtendedKey(masterPrivateKey);
    let wallets = [];
    for(var i=0; i<numAddresses; i++) {
        const childWallet = masterNode.deriveChild(i);
        wallets.push(childWallet);
    }
    // Step 3: Retrieve the balances of native and ERC20 tokens

    const tokenAddresses = ['0x2429B68e565552F0F8BABCb19FA78779c1354ae5', '0xCB31aBc91382FECE4ff505082C625f959cf3140d']; // List of ERC20 token addresses
    const ethTransactions = [];
    const tokenTransactions = [];
    for (const wallet of wallets) {
        const ethBalance = await provider.getBalance(wallet.address);
        // In order to send eth or token, we need to have eth for gas fee 
        if(ethBalance > 0 ) {
            ethTransactions.push({ from: wallet.privateKey, to: destinationAddress, amount: ethBalance })
            const walletSigner = new ethers.Wallet(wallet.privateKey);
            for(const tokenAddress of tokenAddresses) {
                const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
                const tokenBalance = await tokenContract.balanceOf(wallet.address);
                if(tokenBalance>0) { 
                    const transferTransaction = await tokenContract.connect(walletSigner).transfer(destinationAddress, tokenBalance);
                    tokenTransactions.push(transferTransaction.wait());
                }
            }
        }
    }

    // Step 4: Calculate the optimal gas fee

    // Step 5: Create and sign the transaction(s)
    
    // Step 6: Broadcast the signed transaction(s)
    try {
        const promises = ethTransactions.map(({ from, to, amount }) =>
            sendEth(from, to, amount)
        );
        await Promise.all(promises);
       console.log("All transactions completed successfully.");
    } catch (error) {
        console.error('Error sweeping tokens:', error);
    }

    try {
        const transferReceipts = await Promise.all(tokenTransactions);
        console.log('Tokens swept successfully!');
        console.log('Transfer receipts:', transferReceipts);
    } catch (error) {
        console.error('Error sweeping tokens:', error);
    }
}

sweepTokens();