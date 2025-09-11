import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Login from './pages/user-login/Login';
import { ToastContainer } from 'react-toastify'
import 'react-toastify/ReactToastify.css'

function App() {

  return (
    <>
    <ToastContainer position='top-right' autoClose={3000}/>
      <Router>
        <Routes>
          <Route path='/user-login' element={<Login />} />
        </Routes>
      </Router>
    </>

  );
}

export default App;
