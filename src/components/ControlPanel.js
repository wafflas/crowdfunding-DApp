import React, { Component } from 'react';
import crowdfunding from '../Crowdfunding'; // Εισαγωγή του smart contract (Crowdfunding)
import web3 from '../web3'; // Εισαγωγή του Web3 για σύνδεση με το blockchain
import '../ControlPanel.css'; // Εισαγωγή αρχείου CSS για τη μορφοποίηση

class ControlPanel extends Component {
  state = {
    newOwner: '', // Διεύθυνση του νέου ιδιοκτήτη που θα εισαχθεί από τον χρήστη
    bannedAddress: '', // Διεύθυνση του χρήστη που θα μπλοκαριστεί
    currentAccount: '', // Τρέχων λογαριασμός που είναι συνδεδεμένος
    contractOwner: '', // Διεύθυνση του ιδιοκτήτη του smart contract
    message: '', // Μήνυμα κατάστασης για τον χρήστη
    contractActive: true, // Κατάσταση του συμβολαίου (αν είναι ενεργό)
  };

  // Μεθοδος που εκτελείται όταν φορτώνει το component
  async componentDidMount() {
    try {
      const owner = await crowdfunding.methods.owner().call(); // Λήψη του ιδιοκτήτη του συμβολαίου
      const isActive = await crowdfunding.methods.isActive().call(); // Έλεγχος αν το συμβόλαιο είναι ενεργό
      const accounts = await web3.eth.getAccounts(); // Λήψη του λογαριασμού που είναι συνδεδεμένος
      this.setState({ 
        contractOwner: owner, // Αποθήκευση του ιδιοκτήτη στο state
        currentAccount: accounts[0], // Ορισμός του τρέχοντος λογαριασμού
        contractActive: isActive, // Ενημέρωση για την κατάσταση του συμβολαίου
      });

      // Παρακολούθηση αλλαγών στον λογαριασμό του Metamask
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
          if (accounts.length > 0) {
            this.setState({ currentAccount: accounts[0] }); // Ενημέρωση τρέχοντος λογαριασμού
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

  // Μέθοδος για την ανάληψη των fees από το συμβόλαιο
  handleWithdraw = async () => {
    this.setState({ message: 'Processing withdrawal...' });

    try {
      const accounts = await web3.eth.getAccounts(); // Λήψη λογαριασμών
      await crowdfunding.methods.withdrawFees().send({
        from: accounts[0], // Ανάληψη από τον συνδεδεμένο λογαριασμό
      });

      this.setState({ message: 'Withdrawal successful!' }); // Ενημέρωση για την επιτυχία
    } catch (err) {
      this.setState({ message: 'Error during withdrawal. Please try again.' }); // Μήνυμα αποτυχίας
    }
  };

  // Μέθοδος για αλλαγή του ιδιοκτήτη του συμβολαίου
  handleChangeOwner = async () => {
    const { newOwner } = this.state; // Λήψη της νέας διεύθυνσης από το state
    this.setState({ message: 'Processing owner change...' });

    try {
      const accounts = await web3.eth.getAccounts(); // Λήψη του λογαριασμού που είναι συνδεδεμένος
      await crowdfunding.methods.changeOwner(newOwner).send({
        from: accounts[0], // Εκτέλεση από τον τρέχοντα λογαριασμό
      });

      this.setState({ message: 'Owner changed successfully!' }); // Ενημέρωση για την επιτυχία
    } catch (err) {
      this.setState({ message: 'Error changing owner. Please try again.' }); // Μήνυμα αποτυχίας
    }
  };

  // Μέθοδος για το μπλοκάρισμα ενός entrepreneur
  handleBanEntrepreneur = async () => {
    const { bannedAddress } = this.state; // Λήψη της διεύθυνσης προς μπλοκάρισμα
    this.setState({ message: 'Processing ban...' });

    try {
      const accounts = await web3.eth.getAccounts(); // Λήψη του τρέχοντος λογαριασμού
      await crowdfunding.methods.banEntrepreneur(bannedAddress).send({
        from: accounts[0], // Εκτέλεση από τον τρέχοντα λογαριασμό
      });

      this.setState({ message: 'Entrepreneur banned successfully!' }); // Ενημέρωση για την επιτυχία
    } catch (err) {
      this.setState({ message: 'Error banning entrepreneur. Please try again.' }); // Μήνυμα αποτυχίας
    }
  };

  // Μέθοδος για την καταστροφή του συμβολαίου
  handleDestroy = async () => {
    this.setState({ message: 'Destroying contract...' });

    try {
      const accounts = await web3.eth.getAccounts(); // Λήψη του τρέχοντος λογαριασμού
      await crowdfunding.methods.destroyContract().send({
        from: accounts[0], // Εκτέλεση από τον τρέχοντα λογαριασμό
      });

      this.setState({
        message: 'Contract destroyed successfully! No new campaigns can be created.', // Ενημέρωση για την επιτυχία
        contractActive: false, // Ενημέρωση της κατάστασης του συμβολαίου ως ανενεργό
      });
    } catch (err) {
      this.setState({ message: 'Error destroying contract. Please try again.' }); // Μήνυμα αποτυχίας
    }
  };

  render() {
    const { currentAccount, contractOwner, newOwner, bannedAddress, message, contractActive } = this.state;
    const isOwner = currentAccount.toLowerCase() === contractOwner.toLowerCase(); // Έλεγχος αν ο χρήστης είναι ιδιοκτήτης

    return (
      <div className="control-panel-container">
        <h3 className="control-panel-title">Control Panel</h3>
        {message && <p className="control-panel-message">{message}</p>}

        {/* Κουμπί για ανάληψη */}
        <button
          className={`control-panel-button ${isOwner && contractActive ? '' : 'disabled'}`}
          onClick={this.handleWithdraw}
          disabled={!isOwner || !contractActive} // Ενεργοποίηση μόνο αν είναι ο ιδιοκτήτης και το συμβόλαιο είναι ενεργό
        >
          Withdraw
        </button>

        {/* Περιοχή αλλαγής ιδιοκτήτη */}
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

        {/* Περιοχή μπλοκαρίσματος entrepreneur */}
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

        {/* Κουμπί για καταστροφή του συμβολαίου */}
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
