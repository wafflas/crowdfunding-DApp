import Web3 from 'web3';

let web3;

if (typeof window !== 'undefined' && window.ethereum) {
    web3 = new Web3(window.ethereum);
    window.ethereum.request({ method: 'eth_requestAccounts' });
} else {
    console.error('MetaMask is not installed!');
}

export default web3;