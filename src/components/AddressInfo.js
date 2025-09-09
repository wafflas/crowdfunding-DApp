import React, { Component } from 'react';
import crowdfunding from '../Crowdfunding'; // Εισαγωγή του smart contract (Crowdfunding) 
import web3 from '../web3'; // Εισαγωγή του web3 για την αλληλεπίδραση με το blockchain
import '../AddressInfo.css'; // Εισαγωγή αρχείου CSS για μορφοποίηση

class AddressInfo extends Component {
  state = {
    currentAccount: '', // Καταγραφή της τρέχουσας συνδεδεμένης διεύθυνσης
    owner: '', // Καταγραφή της διεύθυνσης του ιδιοκτήτη του συμβολαίου
    contractBalance: '0', // Υπόλοιπο του συμβολαίου σε ETH
    collectedFees: '0', // Συνολικά συλλεγόμενα fees από το συμβόλαιο
    message: '', // Μήνυμα που εμφανίζεται στον χρήστη (π.χ., σφάλματα ή ειδοποιήσεις)
  };

  // Μέθοδος που εκτελείται όταν φορτώνει το component
  async componentDidMount() {
    const privilegedAddress = '0x153dfef4355E823dCB0FCc76Efe942BefCa86477'; // Η προνομιούχα διεύθυνση που θεωρείται πάντοτε owner

    try {
      // Λήψη λογαριασμών από το Metamask
      const accounts = await web3.eth.requestAccounts();
      if (!accounts || accounts.length === 0) {
        this.setState({ message: 'Please connect your Metamask!' }); // Ενημέρωση αν δεν υπάρχει λογαριασμός
        return;
      }

      const currentAccount = accounts[0]; // Η τρέχουσα συνδεδεμένη διεύθυνση
      let contractBalance = '0'; // Αρχική τιμή υπολοίπου συμβολαίου
      let collectedFees = '0'; // Αρχική τιμή των συλλεγόμενων fees
      let owner = ''; // Αρχική τιμή της διεύθυνσης του ιδιοκτήτη

      try {
        // Λήψη δεδομένων από το συμβόλαιο
        contractBalance = await web3.eth.getBalance(crowdfunding.options.address); // Υπόλοιπο συμβολαίου
        collectedFees = await crowdfunding.methods.collectedFees().call(); // Συλλεγόμενα fees
        owner = await crowdfunding.methods.owner().call(); // Διεύθυνση ιδιοκτήτη από το συμβόλαιο
      } catch (err) {
        console.error('Error fetching contract data:', err); // Σφάλμα κατά την ανάκτηση δεδομένων
      }

      // Έλεγχος αν η τρέχουσα διεύθυνση είναι η προνομιούχα διεύθυνση
      const isPrivileged = currentAccount.toLowerCase() === privilegedAddress.toLowerCase();

      // Ρύθμιση της κατάστασης του component
      this.setState({
        currentAccount, // Η τρέχουσα διεύθυνση χρήστη
        owner: isPrivileged ? privilegedAddress : owner, // Αν είναι η προνομιούχα διεύθυνση, θεωρείται owner
        contractBalance: web3.utils.fromWei(contractBalance, 'ether'), // Μετατροπή υπολοίπου σε ETH
        collectedFees: web3.utils.fromWei(collectedFees, 'ether'), // Μετατροπή fees σε ETH
        message: '', // Εκκαθάριση μηνύματος
      });

      // Παρακολούθηση αλλαγών στους λογαριασμούς του Metamask
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          this.setState({ message: 'Please connect your Metamask!' }); // Ενημέρωση αν αποσυνδεθεί ο χρήστης
        } else {
          const updatedAccount = accounts[0]; // Νέα τρέχουσα διεύθυνση
          const isPrivileged = updatedAccount.toLowerCase() === privilegedAddress.toLowerCase(); // Έλεγχος αν είναι η προνομιούχα διεύθυνση
          this.setState({
            currentAccount: updatedAccount, // Ενημέρωση της τρέχουσας διεύθυνσης
            owner: isPrivileged ? privilegedAddress : owner, // Ενημέρωση του ιδιοκτήτη
            message: '', // Εκκαθάριση μηνύματος
          });
        }
      });
    } catch (error) {
      console.error('Error connecting to Metamask:', error); // Σφάλμα κατά τη σύνδεση στο Metamask
      this.setState({ message: 'Please connect to Metamask!' }); // Μήνυμα για αποτυχία σύνδεσης
    }
  }

  render() {
    const { currentAccount, owner, contractBalance, collectedFees, message } = this.state; // Κατάσταση της εφαρμογής

    return (
      <div className="address-info-container">
        {message && <p className="address-info-message">{message}</p>} {/* Εμφάνιση μηνύματος */}
        <p>
          <strong>Current Address:</strong>{' '}
          <span className="bordered-box">{currentAccount || 'Not connected'}</span> {/* Η τρέχουσα διεύθυνση */}
        </p>
        <p>
          <strong>Owner's Address:</strong>{' '}
          <span className="bordered-box">{owner || 'Fetching...'}</span> {/* Η διεύθυνση του ιδιοκτήτη */}
        </p>
        <p>
          <strong>Contract Balance:</strong>{' '}
          <span className="bordered-box">{contractBalance || '0'} ETH</span> {/* Το υπόλοιπο του συμβολαίου */}
        </p>
        <p>
          <strong>Collected Fees:</strong>{' '}
          <span className="bordered-box">{collectedFees || '0'} ETH</span> {/* Τα συλλεγόμενα fees */}
        </p>
      </div>
    );
  }
}

export default AddressInfo; // Εξαγωγή του component
