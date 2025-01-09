import { Routes, Route } from "react-router-dom";
import Login from  "../src/components/login";
import Register from "../src/components/Register";
import ForgotPassword from "./components/ForgotPassword";
import RemarkUI from "./components/RemarkUI";
import Notifications from "./components/Notifications";
import ManageUsers from "./components/ManageUsers";
import ApproverDashboard from "./components/ApproverDashboard";
import History from "./components/History";
import EditProfile from "./components/EditProfile";
import OTPUI from "./components/OTPUI";
import ProfileDashboard from "./components/ProfileDashboard";
import ChangePassword from "./components/ChangePassword";
import ApprovalPage from "./components/ApprovalPage";
const App = () => {
  return (
   
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/remark-pdf" element={<RemarkUI />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users/manage" element={<ManageUsers />} />
        <Route path="/dashboard" element={<ApproverDashboard/>} />
        <Route path="/history" element={<History/>} />
        <Route path="/edit/profile" element={<EditProfile/>} />
        <Route path="/otp" element={<OTPUI/>} />
        <Route path="/profile" element={<ProfileDashboard/>} />
        <Route path="/changepassword" element={<ChangePassword/>} />
        <Route path="/approval" element={<ApprovalPage/>} />
        
      </Routes>
    
  );
};

export default App;