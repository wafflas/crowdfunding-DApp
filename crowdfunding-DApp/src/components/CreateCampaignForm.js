import React, { Component } from 'react';
import crowdfunding from "../Crowdfunding"; 
import web3 from '../web3'; 
import './css/CreateCampaignForm.css'; 

class CreateCampaignForm extends Component {
  state = {
    title: '', 
    pledgeCost: '', 
    pledgesNeeded: '', 
    message: '', 
    isOwner: false, 
    isBanned: false, 
    currentAccount: '', 
  };

  async componentDidMount() {
    try {
      const owner = await crowdfunding.methods.owner().call(); 
      const accounts = await web3.eth.getAccounts(); 
      const currentAccount = accounts[0]; 

      const isBanned = await crowdfunding.methods.bannedEntrepreneurs(currentAccount).call(); 

      this.setState({
        isOwner: owner.toLowerCase() === currentAccount.toLowerCase(), 
        isBanned, 
        currentAccount, 
      });

      if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
          const updatedAccount = accounts[0]; 
          const updatedIsBanned = await crowdfunding.methods.bannedEntrepreneurs(updatedAccount).call(); 

          this.setState({
            isOwner: owner.toLowerCase() === updatedAccount.toLowerCase(), 
            isBanned: updatedIsBanned, 
          });
        });
      }
    } catch (error) {
      console.error('Error loading owner or account:', error); 
    }
  }

  onSubmit = async (event) => {
    event.preventDefault(); 

    const { title, pledgeCost, pledgesNeeded } = this.state;

    this.setState({ message: 'Transaction is being processed...' }); 

    try {
      const accounts = await web3.eth.getAccounts(); 
      const pledgeCostInWei = web3.utils.toWei(pledgeCost, 'ether'); 
      const valueInWei = web3.utils.toWei('0.02', 'ether'); 

      await crowdfunding.methods.createCampaign(title, pledgeCostInWei, pledgesNeeded).send({
        from: accounts[0], 
        value: valueInWei, 
      });

      this.setState({ message: 'Campaign successfully created!' }); 
    } catch (err) {
      console.error('Error creating campaign:', err); 
      this.setState({ message: 'There was an error creating the campaign.' }); 
    }
  };

  render() {
    const { title, pledgeCost, pledgesNeeded, message, isOwner, isBanned } = this.state;

    const isDisabled = isOwner || isBanned; 

    return (
      <div className="create-campaign-container">
        <h3 className="form-title">New Campaign</h3>
        <form onSubmit={this.onSubmit} className="create-campaign-form">
          <div className="form-group">
            <label className="form-label">Title:</label>
            <input
              className="form-input"
              value={title} 
              onChange={(event) => this.setState({ title: event.target.value })} 
              placeholder="Enter the Campaign Title" 
              disabled={isDisabled} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pledge cost:</label>
            <input
              type="text"
              className="form-input"
              value={pledgeCost} 
              onChange={(event) => this.setState({ pledgeCost: event.target.value })} 
              placeholder="Enter pledge cost in ETH" 
              disabled={isDisabled} 
            />
          </div>
          <div className="form-group">
            <label className="form-label">Number of pledges:</label>
            <input
              type="text"
              className="form-input"
              value={pledgesNeeded} 
              onChange={(event) => this.setState({ pledgesNeeded: event.target.value })} 
              placeholder="Enter number of pledges" 
              disabled={isDisabled} 
            />
          </div>
          <button
            type="submit"
            className={`form-button ${isDisabled ? 'disabled' : ''}`} 
            disabled={isDisabled} 
          >
            Create
          </button>
        </form>
        <p className="form-message">{message}</p> 
      </div>
    );
  }
}

export default CreateCampaignForm; 
