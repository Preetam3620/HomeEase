import { Routes, Route } from 'react-router-dom';
import ProviderLayout from '@/components/layouts/ProviderLayout';
import OffersView from '@/components/provider/OffersView';
import JobsView from '@/components/provider/JobsView';
import ProfileView from '@/components/provider/ProfileView';

const ProviderDashboard = () => {
  return (
    <ProviderLayout>
      <Routes>
        <Route path="/" element={<OffersView />} />
        <Route path="/jobs" element={<JobsView />} />
        <Route path="/profile" element={<ProfileView />} />
      </Routes>
    </ProviderLayout>
  );
};

export default ProviderDashboard;
