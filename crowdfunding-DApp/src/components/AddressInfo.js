import React, { Component } from 'react';
import crowdfunding from '../Crowdfunding'; 
import web3 from '../web3'; 
import './css/AddressInfo.css'; 

class AddressInfo extends Component {
  state = {
    currentAccount: '', 
    owner: '', 
    contractBalance: '0', 
    collectedFees: '0', 
    message: '', 
  };


  async componentDidMount() {
    const privilegedAddress = '0x153dfef4355E823dCB0FCc76Efe942BefCa86477'; 

    try {
   
      const accounts = await web3.eth.requestAccounts();
      if (!accounts || accounts.length === 0) {
        this.setState({ message: 'Please connect your Metamask!' }); 
        return;
      }

      const currentAccount = accounts[0]; 
      let contractBalance = '0'; 
      let collectedFees = '0';
      let owner = ''; 

      try {
    
        contractBalance = await web3.eth.getBalance(crowdfunding.options.address); 
        collectedFees = await crowdfunding.methods.collectedFees().call(); 
        owner = await crowdfunding.methods.owner().call(); 
      } catch (err) {
        console.error('Error fetching contract data:', err); 
      }


      const isPrivileged = currentAccount.toLowerCase() === privilegedAddress.toLowerCase();


      this.setState({
        currentAccount, 
        owner: isPrivileged ? privilegedAddress : owner, 
        contractBalance: web3.utils.fromWei(contractBalance, 'ether'), 
        collectedFees: web3.utils.fromWei(collectedFees, 'ether'), 
        message: '', 
      });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.setState({ message: 'Please connect your Metamask!' }); 
        } else {
          const updatedAccount = accounts[0]; 
          const isPrivileged = updatedAccount.toLowerCase() === privilegedAddress.toLowerCase(); 
          this.setState({
            currentAccount: updatedAccount, 
            owner: isPrivileged ? privilegedAddress : owner, 
            message: '', 
          });
        }
      });
    } catch (error) {
      console.error('Error connecting to Metamask:', error); 
      this.setState({ message: 'Please connect to Metamask!' }); 
    }
  }

  render() {
    const { currentAccount, owner, contractBalance, collectedFees, message } = this.state; 

    return (
      <div className="address-info-container">
        {message && <p className="address-info-message">{message}</p>} 
        <p>
          <strong>Current Address:</strong>{' '}
          <span className="bordered-box">{currentAccount || 'Not connected'}</span> 
        </p>
        <p>
          <strong>Owner's Address:</strong>{' '}
          <span className="bordered-box">{owner || 'Fetching...'}</span> 
        </p>
        <p>
          <strong>Contract Balance:</strong>{' '}
          <span className="bordered-box">{contractBalance || '0'} ETH</span> 
        </p>
        <p>
          <strong>Collected Fees:</strong>{' '}
            <span className="bordered-box">{collectedFees || '0'} ETH</span> 
        </p>
      </div>
    );
  }
}

export default AddressInfo; 
