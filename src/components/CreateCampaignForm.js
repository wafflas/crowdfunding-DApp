import React, { Component } from 'react';
import crowdfunding from "../Crowdfunding"; // Εισαγωγή του smart contract (Crowdfunding)
import web3 from '../web3'; // Εισαγωγή του web3 για την αλληλεπίδραση με το blockchain
import '../CreateCampaignForm.css'; // Εισαγωγή αρχείου CSS για μορφοποίηση

class CreateCampaignForm extends Component {
  state = {
    title: '', // Τίτλος της καμπάνιας
    pledgeCost: '', // Κόστος pledge (υπόσχεσης)
    pledgesNeeded: '', // Αριθμός απαραίτητων pledges
    message: '', // Μήνυμα που εμφανίζεται στον χρήστη (π.χ. επιτυχία ή αποτυχία)
    isOwner: false, // Καταγράφει αν ο τρέχων χρήστης είναι ο ιδιοκτήτης του συμβολαίου
    isBanned: false, // Καταγράφει αν ο τρέχων χρήστης είναι banned
    currentAccount: '', // Η τρέχουσα συνδεδεμένη διεύθυνση
  };

  async componentDidMount() {
    try {
      const owner = await crowdfunding.methods.owner().call(); // Λήψη της διεύθυνσης του ιδιοκτήτη από το συμβόλαιο
      const accounts = await web3.eth.getAccounts(); // Λήψη της λίστας λογαριασμών από το Metamask
      const currentAccount = accounts[0]; // Η πρώτη διεύθυνση είναι η συνδεδεμένη διεύθυνση

      const isBanned = await crowdfunding.methods.bannedEntrepreneurs(currentAccount).call(); 
      // Έλεγχος αν ο χρήστης είναι banned (χρησιμοποιώντας το mapping από το συμβόλαιο)

      this.setState({
        isOwner: owner.toLowerCase() === currentAccount.toLowerCase(), // Ελέγχουμε αν ο currentAccount είναι ο owner
        isBanned, // Ενημέρωση κατάστασης αν ο χρήστης είναι banned
        currentAccount, // Αποθήκευση της τρέχουσας συνδεδεμένης διεύθυνσης
      });

      // Ενημέρωση αν αλλάξει ο λογαριασμός στο Metamask
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', async (accounts) => {
          const updatedAccount = accounts[0]; // Νέα τρέχουσα διεύθυνση
          const updatedIsBanned = await crowdfunding.methods.bannedEntrepreneurs(updatedAccount).call(); 
          // Ενημέρωση αν ο νέος λογαριασμός είναι banned

          this.setState({
            currentAccount: updatedAccount, // Ενημέρωση της τρέχουσας διεύθυνσης
            isOwner: owner.toLowerCase() === updatedAccount.toLowerCase(), // Ενημέρωση αν είναι owner
            isBanned: updatedIsBanned, // Ενημέρωση αν είναι banned
          });
        });
      }
    } catch (error) {
      console.error('Error loading owner or account:', error); // Σφάλμα κατά τη φόρτωση του owner ή του λογαριασμού
    }
  }

  onSubmit = async (event) => {
    event.preventDefault(); // Αποφυγή της προεπιλεγμένης συμπεριφοράς φόρμας (refresh)

    const { title, pledgeCost, pledgesNeeded } = this.state;

    this.setState({ message: 'Transaction is being processed...' }); // Ενημέρωση για την επεξεργασία της συναλλαγής

    try {
      const accounts = await web3.eth.getAccounts(); // Λήψη λογαριασμών από το Metamask
      const pledgeCostInWei = web3.utils.toWei(pledgeCost, 'ether'); // Μετατροπή του pledge cost από ETH σε Wei
      const valueInWei = web3.utils.toWei('0.02', 'ether'); // Αμοιβή δημιουργίας καμπάνιας

      await crowdfunding.methods.createCampaign(title, pledgeCostInWei, pledgesNeeded).send({
        from: accounts[0], // Αποστολέας της συναλλαγής
        value: valueInWei, // Αμοιβή συναλλαγής
      });

      this.setState({ message: 'Campaign successfully created!' }); // Ενημέρωση για επιτυχία
    } catch (err) {
      console.error('Error creating campaign:', err); // Καταγραφή του σφάλματος στη κονσόλα
      this.setState({ message: 'There was an error creating the campaign.' }); // Ενημέρωση για αποτυχία
    }
  };

  render() {
    const { title, pledgeCost, pledgesNeeded, message, isOwner, isBanned } = this.state;

    const isDisabled = isOwner || isBanned; // Το κουμπί είναι απενεργοποιημένο αν ο χρήστης είναι owner ή banned

    return (
      <div className="create-campaign-container">
        <h3 className="form-title">New Campaign</h3>
        <form onSubmit={this.onSubmit} className="create-campaign-form">
          <div className="form-group">
            <label className="form-label">Title:</label>
            <input
              className="form-input"
              value={title} // Τιμή του τίτλου
              onChange={(event) => this.setState({ title: event.target.value })} // Ενημέρωση του state όταν αλλάζει η τιμή
              placeholder="Enter the Campaign Title" // Placeholder του πεδίου
              disabled={isDisabled} // Απενεργοποιημένο αν ο χρήστης είναι owner ή banned
            />
          </div>
          <div className="form-group">
            <label className="form-label">Pledge cost:</label>
            <input
              type="text"
              className="form-input"
              value={pledgeCost} // Τιμή του pledge cost
              onChange={(event) => this.setState({ pledgeCost: event.target.value })} // Ενημέρωση του state όταν αλλάζει η τιμή
              placeholder="Enter pledge cost in ETH" // Placeholder του πεδίου
              disabled={isDisabled} // Απενεργοποιημένο αν ο χρήστης είναι owner ή banned
            />
          </div>
          <div className="form-group">
            <label className="form-label">Number of pledges:</label>
            <input
              type="text"
              className="form-input"
              value={pledgesNeeded} // Τιμή του αριθμού pledges
              onChange={(event) => this.setState({ pledgesNeeded: event.target.value })} // Ενημέρωση του state όταν αλλάζει η τιμή
              placeholder="Enter number of pledges" // Placeholder του πεδίου
              disabled={isDisabled} // Απενεργοποιημένο αν ο χρήστης είναι owner ή banned
            />
          </div>
          <button
            type="submit"
            className={`form-button ${isDisabled ? 'disabled' : ''}`} // Καθορισμός CSS class ανάλογα με το αν είναι disabled
            disabled={isDisabled} // Απενεργοποιημένο αν ο χρήστης είναι owner ή banned
          >
            Create
          </button>
        </form>
        <p className="form-message">{message}</p> {/* Μήνυμα ενημέρωσης */}
      </div>
    );
  }
}

export default CreateCampaignForm; // Εξαγωγή του component
