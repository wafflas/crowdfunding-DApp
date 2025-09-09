// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Crowdfunding {
    address public owner; // Η διεύθυνση του ιδιοκτήτη του συμβολαίου
    address public constant privilegedAddress = 0x153dfef4355E823dCB0FCc76Efe942BefCa86477; // Η διεύθυνση με ειδικά δικαιώματα

    uint public nextCampaignId; // Επόμενο ID καμπάνιας
    uint public campaignFee = 0.02 ether; // Κόστος δημιουργίας καμπάνιας
    uint public collectedFees; // Συνολικά τέλη που έχουν συγκεντρωθεί
    bool public isActive = true; // Κατάσταση συμβολαίου (ενεργό ή μη)

    // Καταστάσεις μιας καμπάνιας
    enum CampaignState { Created, Cancelled, Fulfilled }

    // Δομή που περιγράφει μια καμπάνια
    struct Campaign {
        uint campaignId; // ID της καμπάνιας
        address entrepreneur; // Διεύθυνση του δημιουργού της καμπάνιας
        string title; // Τίτλος της καμπάνιας
        uint pledgeCost; // Κόστος κάθε υπόσχεσης (pledge)
        uint pledgesNeeded; // Απαιτούμενος αριθμός υποσχέσεων
        uint pledgesCount; // Υποσχέσεις που έχουν ήδη γίνει
        uint fundsRaised; // Συγκεντρωμένα κεφάλαια
        CampaignState state; // Κατάσταση της καμπάνιας
        address[] backers; // Λίστα χρηστών που υποστήριξαν την καμπάνια
    }

    mapping(uint => Campaign) public campaigns; // Χαρτογράφηση καμπανιών
    mapping(uint => mapping(address => uint)) public investments; // Επενδύσεις κάθε χρήστη ανά καμπάνια
    mapping(address => bool) public bannedEntrepreneurs; // Καταγραφή διευθύνσεων που έχουν αποκλειστεί

    // Νέο modifier που επεκτείνει τα δικαιώματα του ιδιοκτήτη στη διεύθυνση privilegedAddress
    modifier onlyOwnerOrPrivileged() {
        require(msg.sender == owner || msg.sender == privilegedAddress, "Not authorized");
        _;
    }

    // Επιτρέπει πρόσβαση μόνο στον ιδιοκτήτη
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // Επιτρέπει ενέργειες μόνο αν ο χρήστης δεν είναι αποκλεισμένος
    modifier notBanned() {
        require(!bannedEntrepreneurs[msg.sender], "You are banned");
        _;
    }

    // Επιτρέπει ενέργειες μόνο αν η καμπάνια υπάρχει
    modifier campaignExists(uint campaignId) {
        require(campaignId < nextCampaignId, "Campaign does not exist");
        _;
    }

    // Επιτρέπει ενέργειες μόνο στον δημιουργό της καμπάνιας
    modifier onlyEntrepreneur(uint campaignId) {
        require(msg.sender == campaigns[campaignId].entrepreneur, "Not authorized");
        _;
    }

    // Επιτρέπει ενέργειες μόνο αν το συμβόλαιο είναι ενεργό
    modifier contractActive() {
        require(isActive, "Contract is not active");
        _;
    }

    // Διάφορα events για ενημέρωση συμβάντων στο συμβόλαιο
    event CampaignCreated(uint campaignId, address entrepreneur, string title);
    event PledgeMade(uint campaignId, address backer, uint amount);
    event CampaignCancelled(uint campaignId);
    event CampaignFulfilled(uint campaignId, uint amountTransferred);
    event InvestorRefunded(address investor, uint amount);
    event OwnerWithdrawal(uint amount);
    event EntrepreneurBanned(address entrepreneur);
    event ContractDeactivated(address owner);
    event CampaignFeeUpdated(uint newFee);
    event CampaignStateUpdated(uint campaignId, string state);

    // Ο constructor θέτει τον ιδιοκτήτη του συμβολαίου κατά την ανάπτυξη
    constructor() {
        owner = msg.sender;
    }

    // Ενημερώνει το τέλος δημιουργίας καμπάνιας
    function setCampaignFee(uint newFee) public onlyOwnerOrPrivileged {
        campaignFee = newFee;
        emit CampaignFeeUpdated(newFee);
    }

    // Δημιουργία νέας καμπάνιας
    function createCampaign(string memory title, uint pledgeCost, uint pledgesNeeded)
        public
        payable
        notBanned
        contractActive
    {
        require(msg.value == campaignFee, "Incorrect campaign fee");
        require(bytes(title).length > 0, "Title cannot be empty");

        // Βεβαίωση ότι ο τίτλος της καμπάνιας δεν υπάρχει ήδη
        for (uint i = 0; i < nextCampaignId; i++) {
            require(keccak256(bytes(campaigns[i].title)) != keccak256(bytes(title)), "Title already exists");
        }

        collectedFees += msg.value; // Προσθήκη των τελών στο συνολικό υπόλοιπο

        // Δημιουργία της νέας καμπάνιας
        Campaign storage newCampaign = campaigns[nextCampaignId];
        newCampaign.campaignId = nextCampaignId;
        newCampaign.entrepreneur = msg.sender;
        newCampaign.title = title;
        newCampaign.pledgeCost = pledgeCost;
        newCampaign.pledgesNeeded = pledgesNeeded;
        newCampaign.pledgesCount = 0;
        newCampaign.fundsRaised = 0;
        newCampaign.state = CampaignState.Created;

        emit CampaignCreated(nextCampaignId, msg.sender, title);
        emit CampaignStateUpdated(nextCampaignId, "Created");
        nextCampaignId++;
    }

    // Υποστήριξη καμπάνιας με pledge
    function pledge(uint campaignId, uint numberOfPledges)
        public
        payable
        campaignExists(campaignId)
        contractActive
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.state == CampaignState.Created, "Invalid campaign state");
        uint totalCost = campaign.pledgeCost * numberOfPledges;
        require(msg.value == totalCost, "Incorrect pledge amount");
        require(campaign.pledgesCount + numberOfPledges <= campaign.pledgesNeeded, "Exceeds required pledges");

        if (investments[campaignId][msg.sender] == 0) {
            campaign.backers.push(msg.sender);
        }

        investments[campaignId][msg.sender] += numberOfPledges;
        campaign.pledgesCount += numberOfPledges;
        campaign.fundsRaised += totalCost;

        emit PledgeMade(campaignId, msg.sender, totalCost);
        emit CampaignStateUpdated(campaignId, "Pledged");
    }

    // Ακύρωση καμπάνιας
    function cancelCampaign(uint campaignId)
        public
        campaignExists(campaignId)
        contractActive
        onlyEntrepreneur(campaignId)
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.state == CampaignState.Created, "Invalid campaign state");

        campaign.state = CampaignState.Cancelled;
        emit CampaignCancelled(campaignId);
        emit CampaignStateUpdated(campaignId, "Cancelled");
    }

    // Επιστροφή επένδυσης σε χρήστη
    function refundInvestor(uint campaignId) public campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.state == CampaignState.Cancelled, "Campaign is not cancelled");
        uint investment = investments[campaignId][msg.sender];
        require(investment > 0, "No investment found");

        investments[campaignId][msg.sender] = 0;
        uint refundAmount = investment * campaign.pledgeCost;
        payable(msg.sender).transfer(refundAmount);

        emit InvestorRefunded(msg.sender, refundAmount);
    }

    // Ολοκλήρωση καμπάνιας
    function completeCampaign(uint campaignId)
        public
        campaignExists(campaignId)
        onlyEntrepreneur(campaignId)
        contractActive
    {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.state == CampaignState.Created, "Invalid campaign state");
        require(campaign.pledgesCount >= campaign.pledgesNeeded, "Not enough pledges");

        uint amountToEntrepreneur = (campaign.fundsRaised * 80) / 100;
        campaign.state = CampaignState.Fulfilled;
        payable(campaign.entrepreneur).transfer(amountToEntrepreneur);

        emit CampaignFulfilled(campaignId, amountToEntrepreneur);
        emit CampaignStateUpdated(campaignId, "Fulfilled");
    }

    // Απόσυρση τελών από τον ιδιοκτήτη
    function withdrawFees() public onlyOwnerOrPrivileged {
        uint amountToWithdraw = collectedFees;
        require(amountToWithdraw > 0, "No fees to withdraw");
        collectedFees = 0;
        payable(owner).transfer(amountToWithdraw);

        emit OwnerWithdrawal(amountToWithdraw);
    }

    // Αποκλεισμός επιχειρηματία
    function banEntrepreneur(address entrepreneur) public onlyOwnerOrPrivileged {
        bannedEntrepreneurs[entrepreneur] = true;

        // Ακύρωση όλων των ενεργών καμπανιών του επιχειρηματία
        for (uint i = 0; i < nextCampaignId; i++) {
            Campaign storage campaign = campaigns[i];
            if (campaign.entrepreneur == entrepreneur && campaign.state == CampaignState.Created) {
                campaign.state = CampaignState.Cancelled;
                emit CampaignCancelled(i);
            }
        }

        emit EntrepreneurBanned(entrepreneur);
    }

    // Καταστροφή του συμβολαίου
    function destroyContract() public onlyOwnerOrPrivileged {
        isActive = false;

        // Ακύρωση όλων των καμπανιών και επιστροφή χρημάτων στους backers
        for (uint i = 0; i < nextCampaignId; i++) {
            Campaign storage campaign = campaigns[i];
            if (campaign.state == CampaignState.Created) {
                campaign.state = CampaignState.Cancelled;
                for (uint j = 0; j < campaign.backers.length; j++) {
                    address backer = campaign.backers[j];
                    uint amount = investments[i][backer] * campaign.pledgeCost;
                    if (amount > 0) {
                        investments[i][backer] = 0;
                        payable(backer).transfer(amount);
                    }
                }
            }
        }

        uint remainingBalance = address(this).balance;
        payable(owner).transfer(remainingBalance);

        emit ContractDeactivated(owner);
    }

    // Αλλαγή ιδιοκτήτη του συμβολαίου
    function changeOwner(address newOwner) public onlyOwnerOrPrivileged {
        owner = newOwner;
    }
}
