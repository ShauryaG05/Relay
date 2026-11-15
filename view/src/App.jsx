import {BrowserRouter,Routes,Route} from 'react-router-dom';
import Dashboard from './pages/Dashboard';


export default function app(){

  return(
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard/>}></Route>    
        </Routes>
      </BrowserRouter>
    </>
  )
}

