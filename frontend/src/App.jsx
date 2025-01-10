import { Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import RemarkUI from "./pages/RemarkUI";
import Notifications from "./pages/Notifications";
import ManageUsers from "./pages/ManageUsers";
import ApproverDashboard from "./pages/ApproverDashboard";
import History from "./pages/History";
import EditProfile from "./pages/EditProfile";
import OTPUI from "./pages/OTPUI";
import ProfileDashboard from "./pages/ProfileDashboard";
import { AuthProvider } from "../src/contexts/AuthContext";
import ChangePassword from "./pages/ChangePassword";
import ApprovalPage from "./pages/ApprovalPage";
import Correction from "./pages/Correction";
import AdminLogin from "./pages/AdminLogin";
import Support from "./pages/Support";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassOTP from "./pages/ForgotPassOTP";
import SetNewPassword from "./pages/SetNewPassword";
// import 'react-dates/lib/css/_datepicker.css';

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/forgot-password-otp" element={<ForgotPassOTP />} />
        <Route path="/set-new-pass" element={<SetNewPassword />} />
        <Route path="/remark-pdf" element={<RemarkUI />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users/manage" element={<ManageUsers />} />
        <Route path="/page" element={<ApprovalPage />} />
        <Route path="/dashboard" element={<ApproverDashboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/edit/profile" element={<EditProfile />} />
        <Route path="/otp/verify" element={<OTPUI />} />
        <Route path="/profile" element={<ProfileDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/changepassword" element={<ChangePassword />} />
        <Route path="/correction" element={<Correction />} />
        <Route path="/approval" element={<ApprovalPage />} />
        <Route path="/adminLogin" element={<AdminLogin />} />
        <Route path="/support" element={<Support />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
