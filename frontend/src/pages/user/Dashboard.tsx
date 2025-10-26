import { Routes, Route } from 'react-router-dom';
import UserLayout from '@/components/layouts/UserLayout';
import JobsView from '@/components/user/JobsView';
import CreateJobView from '@/components/user/CreateJobView';
import JobDetailView from '@/components/user/JobDetailView';
import Profile from '@/pages/user/Profile';
import GoogleMapsLoader from '@/components/GoogleMapsLoader';

const UserDashboard = () => {
  return (
    <UserLayout>
      <Routes>
        <Route path="/" element={<JobsView />} />
        <Route path="/create" element={<CreateJobView />} />
        <Route path="/jobs/:jobId" element={
          <GoogleMapsLoader>
            <JobDetailView />
          </GoogleMapsLoader>
        } />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </UserLayout>
  );
};

export default UserDashboard;
