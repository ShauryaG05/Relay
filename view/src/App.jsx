import {BrowserRouter,Routes,Route} from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Dash from "./pages/Dashboard_updated"

export default function app(){

  return(
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard/>}></Route>    
          <Route path="/dash" element={<Dash/>}></Route>    
        </Routes>
      </BrowserRouter>
    </>
  )
}

