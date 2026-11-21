// Every route in docs/04-screens-spec.md. Each screen lives in its own folder and has one owner.
import { Route, Routes } from 'react-router'
import { Band } from './screens/band'
import { Baseline } from './screens/baseline'
import { Check } from './screens/check'
import { Demo } from './screens/demo'
import { Home } from './screens/home'
import { Lab, LabCare, LabChoice, LabKit, LabPulse, LabStand } from './screens/lab'
import { Landing } from './screens/landing'
import { Log } from './screens/log'
import { Result } from './screens/result'
import { Room } from './screens/room'
import { Setup } from './screens/setup'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/baseline" element={<Baseline />} />
      <Route path="/home" element={<Home />} />
      <Route path="/log" element={<Log />} />
      <Route path="/check" element={<Check />} />
      <Route path="/result" element={<Result />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/band" element={<Band />} />
      <Route path="/room" element={<Room />} />
      <Route path="/lab" element={<Lab />} />
      <Route path="/lab/stand" element={<LabStand />} />
      <Route path="/lab/choice" element={<LabChoice />} />
      <Route path="/lab/pulse" element={<LabPulse />} />
      <Route path="/lab/care" element={<LabCare />} />
      <Route path="/lab/kit" element={<LabKit />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}
