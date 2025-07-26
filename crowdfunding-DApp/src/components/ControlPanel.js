import React, { Component } from 'react';
import crowdfunding from '../Crowdfunding'; 
import web3 from '../web3'; 
import './css/ControlPanel.css'; 

class ControlPanel extends Component {
  state = {
    newOwner: '', 
    bannedAddress: '', 
    currentAccount: '', 
    contractOwner: '', 
    message: '', 
    contractActive: true, 
  };

  async componentDidMount() {
    try {
      const owner = await crowdfunding.methods.owner().call(); 
      const isActive = await crowdfunding.methods.isActive().call(); 
      const accounts = await web3.eth.getAccounts(); 
      this.setState({ 
        contractOwner: owner, 
        currentAccount: accounts[0], 
        contractActive: isActive, 
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
          if (accounts.length > 0) {
            this.setState({ currentAccount: accounts[0] }); 
          } else {
            this.setState({ currentAccount: '', message: 'Please connect your wallet.' });
          }
        });
      }
    } catch (err) {
      this.setState({ message: 'Error fetching contract owner. Please try again.' });
      console.error('Error loading contract owner:', err);
    }
  }

  handleWithdraw = async () => {
    this.setState({ message: 'Processing withdrawal...' });

    try {
      const accounts = await web3.eth.getAccounts(); 
      await crowdfunding.methods.withdrawFees().send({
        from: accounts[0], 
      });

      this.setState({ message: 'Withdrawal successful!' }); 
    } catch (err) {
      this.setState({ message: 'Error during withdrawal. Please try again.' }); 
    }
  };

  handleChangeOwner = async () => {
    const { newOwner } = this.state; 
    this.setState({ message: 'Processing owner change...' });

    try {
      const accounts = await web3.eth.getAccounts(); 
      await crowdfunding.methods.changeOwner(newOwner).send({
        from: accounts[0], 
      });

      this.setState({ message: 'Owner changed successfully!' }); 
    } catch (err) {
      this.setState({ message: 'Error changing owner. Please try again.' }); 
    }
  };

  handleBanEntrepreneur = async () => {
    const { bannedAddress } = this.state; 
    this.setState({ message: 'Processing ban...' });

    try {
      const accounts = await web3.eth.getAccounts(); 
      await crowdfunding.methods.banEntrepreneur(bannedAddress).send({
        from: accounts[0], 
      });

      this.setState({ message: 'Entrepreneur banned successfully!' }); 
    } catch (err) {
      this.setState({ message: 'Error banning entrepreneur. Please try again.' }); 
    }
  };

  handleDestroy = async () => {
    this.setState({ message: 'Destroying contract...' });

    try {
      const accounts = await web3.eth.getAccounts(); 
      await crowdfunding.methods.destroyContract().send({
        from: accounts[0], 
      });

      this.setState({
        message: 'Contract destroyed successfully! No new campaigns can be created.', 
        contractActive: false, 
      });
    } catch (err) {
      this.setState({ message: 'Error destroying contract. Please try again.' }); 
    }
  };

  render() {
    const { currentAccount, contractOwner, newOwner, bannedAddress, message, contractActive } = this.state;
    const isOwner = currentAccount.toLowerCase() === contractOwner.toLowerCase(); 

    return (
      <div className="control-panel-container">
        <h3 className="control-panel-title">Control Panel</h3>
        {message && <p className="control-panel-message">{message}</p>}

        <button
          className={`control-panel-button ${isOwner && contractActive ? '' : 'disabled'}`}
          onClick={this.handleWithdraw}
          disabled={!isOwner || !contractActive} 
        >
          Withdraw
        </button>

        <div className="control-panel-row">
          <button
            className={`control-panel-button ${isOwner && contractActive ? '' : 'disabled'}`}
            onClick={this.handleChangeOwner}
            disabled={!isOwner || !contractActive}
          >
            Change owner
          </button>
          <input
            className="control-panel-input"
            type="text"
            placeholder="Enter new owner's wallet address"
            value={newOwner}
            onChange={(event) => this.setState({ newOwner: event.target.value })}
            disabled={!isOwner || !contractActive}
          />
        </div>

        <div className="control-panel-row">
          <button
            className={`control-panel-button ${isOwner && contractActive ? '' : 'disabled'}`}
            onClick={this.handleBanEntrepreneur}
            disabled={!isOwner || !contractActive}
          >
            Ban entrepreneur
          </button>
          <input
            className="control-panel-input"
            type="text"
            placeholder="Enter entrepreneur's address"
            value={bannedAddress}
            onChange={(event) => this.setState({ bannedAddress: event.target.value })}
            disabled={!isOwner || !contractActive}
          />
        </div>

        <button
          className={`control-panel-button control-panel-destroy ${isOwner && contractActive ? '' : 'disabled'}`}
          onClick={this.handleDestroy}
          disabled={!isOwner || !contractActive}
        >
          Destroy
        </button>
      </div>
    );
  }
}

export default ControlPanel;
