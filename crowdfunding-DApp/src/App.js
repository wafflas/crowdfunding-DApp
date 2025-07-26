import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import AddressInfo from './components/AddressInfo';
import CampaignList from './components/CampaignList';
import ControlPanel from './components/ControlPanel';
import CreateCampaignForm from './components/CreateCampaignForm';



const App = () => {
  return (
    <div
      className="container mt-5"
      style={{
        border: '1px solid #ccc',
        borderRadius: '10px',
        padding: '20px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        backgroundColor: '#fff',
      }}
    >
      <h1 className="text-center mb-4 ">Crowdfunding DApp</h1>
      <AddressInfo />
      <hr />
      <CreateCampaignForm />
      <hr />
      <CampaignList />
      <hr />
      <ControlPanel />
    </div>
  );
};


export default App;
