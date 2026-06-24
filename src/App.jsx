import Dashboard from './pages/Dashboard'
import Records from './pages/Records'
import Courses from './pages/Courses'
import HairLog from './pages/HairLog'
import Checkin from './pages/Checkin'
import Schedule from './pages/Schedule'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Volunteers from './pages/Volunteers'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="hairlog" element={<HairLog />} />
          <Route path="courses" element={<Courses />} />
          <Route path="records" element={<Records />} />
          <Route path="volunteers" element={<Volunteers />} />
          <Route path="checkin" element={<Checkin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App