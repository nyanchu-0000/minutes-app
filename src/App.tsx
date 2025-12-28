import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { MinutesEditor } from './pages/MinutesEditor';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<MinutesEditor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
