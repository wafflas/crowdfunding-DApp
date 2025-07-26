// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0; // Καθορίζει την έκδοση του Solidity που χρησιμοποιείται

// Δημιουργία συμβολαίου Crowdfunding
contract Crowdfunding {
    address public owner; // Διεύθυνση του ιδιοκτήτη του συμβολαίου
    uint public nextCampaignId; // Αύξων αριθμός για τις καμπάνιες
    uint public campaignFee = 0.02 ether; // Τέλος δημιουργίας καμπάνιας
    bool public isActive = true; // Κατάσταση συμβολαίου (ενεργό/μη ενεργό)

    struct Campaign {
        uint campaignId; // ID καμπάνιας
        address entrepreneur; // Διεύθυνση του επιχειρηματία
        string title; // Τίτλος καμπάνιας
        uint pledgeCost; // Κόστος ανά μετοχή
        uint pledgesNeeded; // Πλήθος μετοχών που απαιτούνται
        uint pledgesCount; // Πλήθος μετοχών που έχουν αποκτηθεί
        uint fundsRaised; // Συγκεντρωμένα κεφάλαια
        bool fulfilled; // Αν η καμπάνια έχει ολοκληρωθεί
        bool cancelled; // Αν η καμπάνια έχει ακυρωθεί
        address[] backers; // Διευθύνσεις επενδυτών
    }

    struct CampaignInfo {
        uint campaignId;
        address entrepreneur;
        string title;
        uint pledgeCost;
        uint pledgesNeeded;
        uint pledgesCount;
        uint fundsRaised;
        bool fulfilled;
        bool cancelled;
    }

    mapping(uint => Campaign) public campaigns;
    mapping(uint => mapping(address => uint)) public investments;
    mapping(address => bool) public bannedEntrepreneurs;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    modifier notBanned() {
        require(!bannedEntrepreneurs[msg.sender], "You are banned");
        _;
    }

    modifier campaignExists(uint campaignId) {
        require(campaignId < nextCampaignId, "Campaign does not exist");
        _;
    }

    modifier onlyEntrepreneur(uint campaignId) {
        require(msg.sender == campaigns[campaignId].entrepreneur, "Not authorized");
        _;
    }

    modifier contractActive() {
        require(isActive, "Contract is not active");
        _;
    }

    event CampaignCreated(uint campaignId, address entrepreneur, string title);
    event PledgeMade(uint campaignId, address backer, uint amount);
    event CampaignCancelled(uint campaignId);
    event CampaignFulfilled(uint campaignId, uint amountTransferred);
    event InvestorRefunded(address investor, uint amount);
    event OwnerWithdrawal(uint amount);
    event EntrepreneurBanned(address entrepreneur);
    event ContractDeactivated(address owner);

    constructor() {
        owner = msg.sender;
    }

    // Δημιουργία καμπάνιας
    function createCampaign(string memory title, uint pledgeCost, uint pledgesNeeded)
        public
        payable
        notBanned
        contractActive
    {
        require(msg.value == campaignFee, "Incorrect campaign fee");

        Campaign storage newCampaign = campaigns[nextCampaignId];
        newCampaign.campaignId = nextCampaignId;
        newCampaign.entrepreneur = msg.sender;
        newCampaign.title = title;
        newCampaign.pledgeCost = pledgeCost;
        newCampaign.pledgesNeeded = pledgesNeeded;
        newCampaign.pledgesCount = 0;
        newCampaign.fundsRaised = 0;
        newCampaign.fulfilled = false;
        newCampaign.cancelled = false;

        emit CampaignCreated(nextCampaignId, msg.sender, title); 
        nextCampaignId++;
    }

    // Επιστροφή του Owner Address
    function getOwner() public view returns (address) {
        return owner;
    }

    // Επένδυση σε καμπάνια
    function pledge(uint campaignId, uint numberOfPledges)
        public
        payable
        campaignExists(campaignId)
        contractActive
    {
        Campaign storage campaign = campaigns[campaignId];
        require(!campaign.fulfilled, "Campaign already fulfilled");
        require(!campaign.cancelled, "Campaign is cancelled");
        uint totalCost = campaign.pledgeCost * numberOfPledges;
        require(msg.value == totalCost, "Incorrect pledge amount");

        if (investments[campaignId][msg.sender] == 0) {
            campaign.backers.push(msg.sender);
        }
        investments[campaignId][msg.sender] += numberOfPledges;
        campaign.pledgesCount += numberOfPledges;
        campaign.fundsRaised += totalCost;

        emit PledgeMade(campaignId, msg.sender, totalCost); 
    }

    // Ακύρωση καμπάνιας
    function cancelCampaign(uint campaignId)
        public
        campaignExists(campaignId)
        contractActive
        onlyEntrepreneur(campaignId)
    {
        Campaign storage campaign = campaigns[campaignId];
        require(!campaign.fulfilled, "Campaign already fulfilled");
        require(!campaign.cancelled, "Campaign already cancelled");

        campaign.cancelled = true;
        emit CampaignCancelled(campaignId); 
    }

    // Επιστροφή χρημάτων σε επενδυτές
    function refundInvestor(uint campaignId) public campaignExists(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        require(campaign.cancelled, "Campaign is not cancelled");
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
        require(!campaign.cancelled, "Campaign is cancelled");
        require(!campaign.fulfilled, "Campaign already fulfilled");
        require(campaign.pledgesCount >= campaign.pledgesNeeded, "Not enough pledges");

        uint amountToEntrepreneur = (campaign.fundsRaised * 80) / 100;
        campaign.fulfilled = true;
        payable(campaign.entrepreneur).transfer(amountToEntrepreneur);

        emit CampaignFulfilled(campaignId, amountToEntrepreneur); 
    }

    // Απόσυρση fees από τον ιδιοκτήτη
    function withdrawFees() public onlyOwner {
        uint totalFees = 0;

        for (uint i = 0; i < nextCampaignId; i++) {
            Campaign storage campaign = campaigns[i];
            if (campaign.fulfilled) {
                uint campaignFeeAmount = (campaign.fundsRaised * 20) / 100; // Αλλάξαμε το όνομα σε campaignFeeAmount
                totalFees += campaignFeeAmount;
            }
        }

        totalFees += nextCampaignId * campaignFee;
        uint contractBalance = address(this).balance;
        require(totalFees <= contractBalance, "Insufficient contract balance for withdrawal");

        payable(owner).transfer(totalFees);

        emit OwnerWithdrawal(totalFees); 
    }

    // Αλλαγή ιδιοκτήτη
    function changeOwner(address newOwner) public onlyOwner {
        owner = newOwner;
    }

    // Απενεργοποίηση συμβολαίου
    function deactivateContract() public onlyOwner {
        isActive = false;
        emit ContractDeactivated(owner); 
    }

    // Επιστροφή υπολοίπου συμβολαίου
    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }
}
