const ethers = require('ethers');
require('dotenv').config();
const { abi } = require("./ERC20.json");
const tokenAddresses = require("./tokenAddresses");

if (!process.env.RPC_URL) {
    throw new Error("RPC_URL not set");
}
if (!process.env.MASTER_PRIVATE_KEY) {
    throw new Error("MASTER_PRIVATE_KEY not set");
}

// Step 1: Set up the required environment
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const masterPrivateKey = process.env.MASTER_PRIVATE_KEY;
const numAddresses = process.env.NUM_ADDRESSES || 10;
const destinationAddress = "0x4618380b02c7FD19d0a072df90d669893e2e9Db4";

// function for sending eth

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
    const ethTransactions = [];
    const tokenTransactions = [];
    
    for(var i=0; i<numAddresses; i++) {
        const childWallet = masterNode.deriveChild(i);
        
        // Step 3: Retrieve the balances of native and ERC20 tokens and bundle signed transactions to submit
    
        const ethBalance = await provider.getBalance(childWallet.address);
        // In order to send eth or token, we need to have eth for gas fee 
        if(ethBalance > 0 ) {
            ethTransactions.push({ from: childWallet.privateKey, to: destinationAddress, amount: ethBalance })
            const walletSigner = new ethers.Wallet(childWallet.privateKey);
            for(const tokenAddress of tokenAddresses) {
                const tokenContract = new ethers.Contract(tokenAddress, abi, provider);
                const tokenBalance = await tokenContract.balanceOf(childWallet.address);
                if(tokenBalance>0) { 
                    const transferTransaction = await tokenContract.connect(walletSigner).transfer(destinationAddress, tokenBalance);
                    tokenTransactions.push(transferTransaction.wait());
                }
            }
        }
    }

    
    // Step 4: Broadcast the signed transaction(s)
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