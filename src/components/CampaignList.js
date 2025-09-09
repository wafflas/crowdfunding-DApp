import React, { Component } from 'react';
import crowdfunding from '../Crowdfunding'; // Εισαγωγή του smart contract Crowdfunding
import web3 from '../web3'; // Εισαγωγή του Web3 για σύνδεση με το blockchain
import '../CampaignList.css'; // Εισαγωγή αρχείου CSS για μορφοποίηση

class CampaignList extends Component {
  state = {
    campaigns: [], // Λίστα με τις καμπάνιες
    userPledges: {}, // Πληροφορίες για τις υποσχέσεις του χρήστη
    userInvestments: {}, // Επενδύσεις του χρήστη
    message: '', // Μήνυμα κατάστασης
    currentAccount: '', // Τρέχων λογαριασμός του χρήστη
    contractOwner: '', // Διεύθυνση του ιδιοκτήτη του smart contract
  };

  // Μέθοδος που εκτελείται όταν φορτώνει το component
  async componentDidMount() {
    await this.loadContractData(); // Φόρτωση δεδομένων του συμβολαίου
    await this.loadCampaigns(); // Φόρτωση λίστας καμπανιών

    // Ενημέρωση όταν αλλάζει ο λογαριασμός στο Metamask
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          this.setState({ currentAccount: accounts[0] });
          await this.loadCampaigns(); // Ενημέρωση καμπανιών όταν αλλάξει ο λογαριασμός
        } else {
          this.setState({ currentAccount: '', message: 'Please connect your wallet.' });
        }
      });
    }
  }

  // Μέθοδος για φόρτωση βασικών δεδομένων του συμβολαίου
  loadContractData = async () => {
    try {
      const owner = await crowdfunding.methods.owner().call(); // Λήψη του ιδιοκτήτη του συμβολαίου
      const accounts = await web3.eth.getAccounts(); // Λήψη τρέχοντος λογαριασμού
      this.setState({ contractOwner: owner, currentAccount: accounts[0] });
    } catch (error) {
      console.error('Error loading contract owner:', error);
      this.setState({ message: 'Error loading contract owner.' });
    }
  };

  // Μέθοδος για φόρτωση της λίστας καμπανιών
  loadCampaigns = async () => {
    try {
      const campaignsCount = await crowdfunding.methods.nextCampaignId().call(); // Λήψη αριθμού καμπανιών
      const campaigns = [];
      const userPledges = {};
      const userInvestments = {};
      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      // Επανάληψη για όλες τις καμπάνιες
      for (let i = 0; i < campaignsCount; i++) {
        const campaign = await crowdfunding.methods.campaigns(i).call(); // Λήψη καμπάνιας
        const userPledge = await crowdfunding.methods.investments(i, currentAccount).call(); // Λήψη υπόσχεσης του χρήστη

        const stateMap = ['Created', 'Cancelled', 'Fulfilled']; // Μετάφραση κατάστασης καμπανιών
        const campaignState = stateMap[campaign.state];

        campaigns.push({
          ...campaign,
          id: i,
          state: campaignState,
        });

        userPledges[i] = parseInt(userPledge);

        if (campaignState === 'Cancelled') {
          const investment = await crowdfunding.methods.investments(i, currentAccount).call();
          userInvestments[i] = parseInt(investment);
        }
      }

      // Αποθήκευση των δεδομένων στο state
      this.setState({ campaigns, userPledges, userInvestments, currentAccount });
    } catch (error) {
      console.error('Error loading campaigns:', error);
      this.setState({ message: 'Error loading campaigns.' });
    }
  };

  // Μέθοδος για pledge σε καμπάνια
  handlePledgeClick = async (campaignId) => {
    try {
      const accounts = await web3.eth.getAccounts();
      const campaign = this.state.campaigns.find((c) => c.id === campaignId);
      const totalCost = campaign.pledgeCost;

      await crowdfunding.methods.pledge(campaignId, 1).send({
        from: accounts[0],
        value: totalCost,
      });

      await this.loadCampaigns(); // Ενημέρωση της λίστας καμπανιών
    } catch (error) {
      console.error('Error pledging:', error);
      this.setState({ message: 'There was an error processing your pledge.' });
    }
  };

  // Μέθοδος για ακύρωση καμπάνιας
  cancelCampaign = async (campaignId) => {
    try {
      const accounts = await web3.eth.getAccounts();
      await crowdfunding.methods.cancelCampaign(campaignId).send({ from: accounts[0] });

      await this.loadCampaigns();
    } catch (error) {
      console.error('Error canceling campaign:', error);
      this.setState({ message: 'There was an error canceling the campaign.' });
    }
  };

  // Μέθοδος για ολοκλήρωση καμπάνιας
  fulfillCampaign = async (campaignId) => {
    try {
      const accounts = await web3.eth.getAccounts();
      await crowdfunding.methods.completeCampaign(campaignId).send({ from: accounts[0] });

      this.setState({ message: 'Campaign successfully fulfilled!' });
      await this.loadCampaigns();
    } catch (error) {
      console.error('Error fulfilling campaign:', error);
      this.setState({ message: 'There was an error fulfilling the campaign.' });
    }
  };

  // Μέθοδος για claim επενδύσεων
  handleClaim = async () => {
    this.setState({ message: 'Processing claim...' });

    try {
      const accounts = await web3.eth.getAccounts();
      const currentAccount = accounts[0];

      // Claim για καμπάνιες που ανήκουν στον τρέχοντα λογαριασμό
      for (const campaign of this.state.campaigns) {
        if (
          campaign.entrepreneur.toLowerCase() === currentAccount.toLowerCase() &&
          this.state.userInvestments[campaign.id] > 0
        ) {
          await crowdfunding.methods.refundInvestor(parseInt(campaign.id)).send({
            from: currentAccount,
          });
        }
      }

      await this.loadCampaigns();
      this.setState({ message: 'Claim successful!' });
    } catch (err) {
      console.error('Error processing claim:', err);
      this.setState({ message: 'Claim failed. Please try again.' });
    }
  };

  // Μέθοδος για εμφάνιση κουμπιού claim
  renderClaimButton() {
    const { campaigns, currentAccount, userInvestments } = this.state;

    const hasClaims = campaigns.some(
      (campaign) =>
        campaign.entrepreneur.toLowerCase() === currentAccount.toLowerCase() &&
        userInvestments[campaign.id] > 0
    );

    return (
      <button
        className={`claim-button ${hasClaims ? 'active' : 'disabled'}`}
        onClick={hasClaims ? this.handleClaim : null}
        disabled={!hasClaims}
      >
        Claim
      </button>
    );
  }

  // Μέθοδος για εμφάνιση μίας καμπάνιας
  renderCampaignRow = (campaign, type) => {
    const { userPledges, currentAccount } = this.state;
    const userPledge = userPledges[campaign.id] || 0;
    const pledgesLeft = parseInt(campaign.pledgesNeeded) - parseInt(campaign.pledgesCount);

    const canCancel =
      campaign.state === 'Created' &&
      currentAccount.toLowerCase() === campaign.entrepreneur.toLowerCase();

    const canFulfill =
      pledgesLeft === 0 &&
      campaign.state === 'Created' &&
      currentAccount.toLowerCase() === campaign.entrepreneur.toLowerCase();

    const canPledge = pledgesLeft > 0;

    return (
      <tr key={campaign.id} className="campaign-row">
        <td>{campaign.entrepreneur}</td>
        <td>{campaign.title}</td>
        <td>{web3.utils.fromWei(campaign.fundsRaised || '0', 'ether')} ETH</td>
        <td>{campaign.pledgesCount}</td>
        <td>{pledgesLeft}</td>
        <td>{userPledge}</td>
        <td>
          {type === 'live' && (
            <button
              className={`action-button pledge-button ${canPledge ? '' : 'disabled'}`}
              onClick={canPledge ? () => this.handlePledgeClick(campaign.id) : null}
              disabled={!canPledge}
            >
              Pledge
            </button>
          )}
          {type === 'live' && canCancel && (
            <button
              className="action-button cancel-button"
              onClick={() => this.cancelCampaign(campaign.id)}
            >
              Cancel
            </button>
          )}
          {type === 'live' && (
            <button
              className={`action-button fulfill-button ${
                canFulfill ? 'enabled' : 'disabled'
              }`}
              onClick={canFulfill ? () => this.fulfillCampaign(campaign.id) : null}
              disabled={!canFulfill}
            >
              Fulfill
            </button>
          )}
        </td>
      </tr>
    );
  };

  renderCampaigns(type) {
    const { campaigns } = this.state;

    return campaigns
      .filter((campaign) => {
        if (type === 'live') return campaign.state === 'Created';
        if (type === 'fulfilled') return campaign.state === 'Fulfilled';
        if (type === 'canceled') return campaign.state === 'Cancelled';
        return false;
      })
      .map((campaign) => this.renderCampaignRow(campaign, type));
  }

  render() {
    const { message } = this.state;

    return (
      <div className="campaign-list-container">
        <h3 className="section-title">Live Campaigns</h3>
        {message && <p>{message}</p>}
        <table className="campaign-table">
          <thead>
            <tr>
              <th>Entrepreneur</th>
              <th>Title</th>
              <th>Price</th>
              <th>Backers</th>
              <th>Pledges Left</th>
              <th>Your Pledges</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>{this.renderCampaigns('live')}</tbody>
        </table>
        <hr />
        <h3 className="section-title">Fulfilled Campaigns</h3>
        <table className="campaign-table">
          <thead>
            <tr>
              <th>Entrepreneur</th>
              <th>Title</th>
              <th>Price</th>
              <th>Backers</th>
              <th>Pledges Left</th>
              <th>Your Pledges</th>
            </tr>
          </thead>
          <tbody>{this.renderCampaigns('fulfilled')}</tbody>
        </table>
        <hr />
        <div className="canceled-campaigns-container">
          <h3 className="section-title">Cancelled Campaigns</h3>
          {this.renderClaimButton()}
        </div>
        <table className="campaign-table">
          <thead>
            <tr>
              <th>Entrepreneur</th>
              <th>Title</th>
              <th>Price</th>
              <th>Backers</th>
              <th>Pledges Left</th>
              <th>Your Pledges</th>
            </tr>
          </thead>
          <tbody>{this.renderCampaigns('canceled')}</tbody>
        </table>
      </div>
    );
  }
}

export default CampaignList;
