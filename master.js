const ethers = require('ethers');

// Generate a random 12-word mnemonic
const mnemonic = ethers.Wallet.createRandom().mnemonic;
console.log("FFF", mnemonic)

// Derive the master node from the mnemonic
// ethers.HDNodeWallet.fromMnemonic
const masterNode = ethers.HDNodeWallet.fromMnemonic(mnemonic)
const wallet = masterNode.deriveChild(100);
console.log("SSS", wallet)

console.log("TTT", masterNode.privateKey)

// Get the master private key
const masterPrivateKey = masterNode.privateKey;

console.log('Master Private Key:', masterPrivateKey);