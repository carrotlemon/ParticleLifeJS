import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Particles from './Particles.jsx'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="flex items-center justify-center">
        <div>
          <Particles />
        </div>
      </div>
    </>
  )
}

export default App
